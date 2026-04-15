import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Target project details (hardcoded for permanent sync)
const TARGET_URL = "https://euwotooilvdahnuovvzr.supabase.co";
const HARDCODED_SECRET = "sync_alhamd_2024_permanent";

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
      await adminClient.rpc("mark_external_sync_event_result", {
        _event_id: event.id,
        _status: "failed",
        _last_error: message,
      });
    }
  }

  logs.push(`✅ Queue processed: ${processed}/${events.length}`);
  return processed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 sync-to-external called");
    
    const bodyRaw = await req.text();
    const body = bodyRaw ? JSON.parse(bodyRaw) : {};
    console.log("📦 mode:", body.mode, "hasKey:", !!body.secret_key);

    // ========= AUTH =========
    const hasSecretKey = body.secret_key === HARDCODED_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const isInternalCall = anonKey.length > 10 && authHeader.includes(anonKey);
    
    if (!hasSecretKey && !isInternalCall) {
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
    const targetServiceRoleKey = Deno.env.get("TARGET_SERVICE_ROLE_KEY");
    
    if (!targetServiceRoleKey) {
      throw new Error("TARGET_SERVICE_ROLE_KEY not configured");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const targetClient = createClient(TARGET_URL, targetServiceRoleKey);
    
    const functionUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/sync-to-external`;

    // Keep sync config always up-to-date
    await adminClient.rpc("set_external_sync_config", {
      _function_url: functionUrl,
      _secret_value: HARDCODED_SECRET,
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
          
          // Upsert in batches of 100
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

      // Also process any queued events
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
