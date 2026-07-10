// Alhamd Academy — Health Endpoint v1
// URL: /functions/v1/api-v1-health

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_VERSION = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const now = new Date().toISOString();
  let dbOk = false;
  let dbError: string | null = null;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await admin.from("teachers").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    dbOk = true;
  } catch (e) {
    dbError = (e as Error).message;
  }

  const status = dbOk ? "ok" : "degraded";
  return new Response(
    JSON.stringify({
      status,
      version: API_VERSION,
      api: "alhamd-academy-erp",
      database: dbOk ? "ok" : "error",
      database_error: dbError,
      server_time: now,
    }),
    {
      status: dbOk ? 200 : 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-API-Version": String(API_VERSION),
      },
    },
  );
});
