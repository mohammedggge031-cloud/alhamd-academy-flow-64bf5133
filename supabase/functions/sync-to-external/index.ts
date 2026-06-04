import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Target project details
const TARGET_URL = "https://euwotooilvdahnuovvzr.supabase.co";

const SYNC_TABLES = [
  "profiles",
  "user_roles",
  "teachers",
  "students",
  "sessions",
  "invoices",
  "invoice_students",
  "expenses",
  "session_reports",
  "monthly_reports",
  "approval_requests",
  "notifications",
  "trial_bookings",
  "subscription_requests",
  "teacher_documents",
  "regulations",
  "academy_settings",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchAllRows(client: ReturnType<typeof createClient>, tableName: string) {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await client.from(tableName).select("*").range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function upsertToTarget(
  targetClient: ReturnType<typeof createClient>,
  tableName: string,
  row: Record<string, unknown>,
) {
  const { error } = await targetClient
    .from(tableName)
    .upsert(row as any, { onConflict: "id" });
  if (error) throw error;
}

async function deleteFromTarget(
  targetClient: ReturnType<typeof createClient>,
  tableName: string,
  recordId: string,
) {
  const { error } = await targetClient
    .from(tableName)
    .delete()
    .eq("id", recordId);
  if (error) throw error;
}

async function processQueuedEvents(
  adminClient: ReturnType<typeof createClient>,
  targetClient: ReturnType<typeof createClient>,
  logs: string[],
  errors: string[],
) {
  const { data: events, error } = await adminClient.rpc("claim_external_sync_events", { _limit: 50 });
  if (error) throw error;

  if (!events || events.length === 0) {
    logs.push("ℹ️ No queued sync events to process");
    return 0;
  }

  let processed = 0;

  for (const event of events) {
    if (!SYNC_TABLES.includes(event.table_name as (typeof SYNC_TABLES)[number])) {
      await adminClient.rpc("mark_external_sync_event_result", {
        _event_id: event.id,
        _status: "processed",
        _last_error: "skipped: table not in sync list",
      });
      continue;
    }

    try {
      if (event.operation === "delete") {
        const recordId = event.record_id ?? (isRecord(event.old_payload) ? String(event.old_payload.id) : null);
        if (!recordId) throw new Error("Missing record id for delete");
        await deleteFromTarget(targetClient, event.table_name, recordId);
      } else {
        if (!isRecord(event.payload)) throw new Error("Missing payload");
        await upsertToTarget(targetClient, event.table_name, event.payload);
      }

      await adminClient.rpc("mark_external_sync_event_result", {
        _event_id: event.id,
        _status: "processed",
      });
      processed++;
    } catch (eventError) {
      const message = eventError instanceof Error 
        ? eventError.message 
        : (typeof eventError === 'object' ? JSON.stringify(eventError) : String(eventError));
      console.error(`❌ Sync error ${event.table_name} ${event.operation}:`, message);
      errors.push(`${event.table_name} ${event.operation}: ${message}`);

      // Auto-skip terminal FK violations on auth-dependent tables — retrying never helps
      // because the auth.users row doesn't exist on the target project.
      const isTerminalFkError =
        message.includes("violates foreign key constraint") &&
        (message.includes("\"users\"") || message.includes("auth.users"));

      await adminClient.rpc("mark_external_sync_event_result", {
        _event_id: event.id,
        _status: isTerminalFkError ? "processed" : "failed",
        _last_error: isTerminalFkError ? `auto-skipped (FK): ${message}` : message,
      });
    }
  }

  logs.push(`✅ Queue processed: ${processed}/${events.length}`);
  return processed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 sync-to-external called");
    
    const bodyRaw = await req.text();
    const body = bodyRaw ? JSON.parse(bodyRaw) : {};

    // ========= AUTH =========
    // Only accept calls signed with SYNC_SECRET. The previous "internal_token"
    // path used the public anon key, which any client could replay.
    const syncSecret = Deno.env.get("SYNC_SECRET") || "";
    const hasSecretKey = syncSecret.length > 0 && body.secret_key === syncSecret;

    if (!hasSecretKey) {
      console.log("❌ Auth failed");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("✅ Auth passed");


    // ========= SETUP =========
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const targetServiceRoleKey = Deno.env.get("TARGET_SERVICE_ROLE_KEY") || "";

    if (!targetServiceRoleKey) {
      return new Response(JSON.stringify({ error: "TARGET_SERVICE_ROLE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const targetClient = createClient(TARGET_URL, targetServiceRoleKey);
    
    const functionUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/sync-to-external`;

    // Keep sync config up-to-date (function URL only, anon key is hardcoded in DB function)
    // Keep sync config up-to-date (store function URL + secret so DB trigger can authenticate)
    await adminClient.rpc("set_external_sync_config", {
      _function_url: functionUrl,
      _sync_secret: syncSecret,
    });


    const mode = body.mode || "schema_and_data";
    const logs: string[] = [];
    const errors: string[] = [];

    // ======= QUEUE MODE (incremental sync) =======
    if (mode === "process_queue") {
      console.log("🔄 Processing queue...");
      const processed = await processQueuedEvents(adminClient, targetClient, logs, errors);
      console.log("✅ Queue done:", processed, "processed");
      return new Response(JSON.stringify({
        success: true,
        mode: "process_queue",
        processed,
        logs,
        errors: errors.length > 0 ? errors : undefined,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ======= FULL SYNC MODE (data only via REST) =======
    if (mode === "schema_and_data" || mode === "data_only") {
      for (const tableName of SYNC_TABLES) {
        try {
          const data = await fetchAllRows(adminClient, tableName);
          if (data.length === 0) {
            logs.push(`ℹ️ ${tableName}: no data`);
            continue;
          }
          
          let synced = 0;
          const batchSize = 100;
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const { error: upsertError } = await targetClient
              .from(tableName)
              .upsert(batch as any[], { onConflict: "id" });
            
            if (upsertError) {
              errors.push(`${tableName} batch: ${upsertError.message}`);
            } else {
              synced += batch.length;
            }
          }
          logs.push(`✅ ${tableName}: ${synced}/${data.length} rows synced`);
        } catch (e) {
          errors.push(`${tableName}: ${e.message}`);
        }
      }

      await processQueuedEvents(adminClient, targetClient, logs, errors);
    }

    return new Response(JSON.stringify({
      success: true,
      mode,
      logs,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
