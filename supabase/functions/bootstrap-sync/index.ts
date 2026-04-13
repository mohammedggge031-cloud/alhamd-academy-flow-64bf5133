import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// One-time bootstrap helper: sets external_sync_config with the SYNC_SECRET
// and triggers initial full sync. Self-destructs after use (returns success once).
serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const syncSecret = Deno.env.get("SYNC_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!syncSecret) throw new Error("SYNC_SECRET not configured");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const functionUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/sync-to-external`;

    // Set the config
    await adminClient.rpc("set_external_sync_config", {
      _function_url: functionUrl,
      _secret_value: syncSecret,
    });

    // Trigger the full sync
    const syncResponse = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret_key: syncSecret, mode: "schema_and_data" }),
    });

    const syncResult = await syncResponse.json();

    return new Response(JSON.stringify({
      success: true,
      config_set: true,
      sync_result: syncResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
