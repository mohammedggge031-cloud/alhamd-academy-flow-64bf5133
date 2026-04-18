import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_URL = "https://euwotooilvdahnuovvzr.supabase.co";

// Connect via Postgres REST is not enough for DDL; we need the SQL endpoint via service role.
// Supabase exposes /pg endpoint but easier: use rpc('exec_sql') if it exists, otherwise use raw connection.
// The cleanest portable way is to call the management API; but here we use a built-in SQL function via HTTP to the Postgres REST
// We'll use the supabase-js admin client to insert into a temp; for DDL we need direct DB.
// Solution: use the postgres connection string from TARGET_DATABASE_URL (we have this secret on source).
// But TARGET_DATABASE_URL is for source DB. For target we don't have a DB URL.
//
// Workaround: use Supabase's pg-meta endpoint via REST is not exposed.
// Practical fix: call this function with a SQL string we want to run using the target's `query` REST endpoint:
//   POST {TARGET_URL}/pg/query  - not available.
//
// Best: use deno-postgres with the target connection string supplied as TARGET_DATABASE_URL secret.
// We'll require the user to add TARGET_DATABASE_URL pointing to euwotooilvdahnuovvzr.

import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const SQL_STATEMENTS = [
  // Add missing columns to teachers
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS about text`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS bio text`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS academic_degree text`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS ijazat text`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS gender text DEFAULT 'male'`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS show_on_website boolean DEFAULT false`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS website_visible_fields text[] DEFAULT '{}'::text[]`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS rate_currency text NOT NULL DEFAULT 'USD'`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS bonus_amount numeric DEFAULT 0`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS bonus_reason text`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS monthly_hours numeric DEFAULT 0`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS monthly_waiting_minutes integer DEFAULT 0`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS monthly_absence_hours numeric DEFAULT 0`,
  `ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS monthly_salary numeric DEFAULT 0`,
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const dbUrl = Deno.env.get("TARGET_DATABASE_URL_EXTERNAL") || "";
    if (!dbUrl) {
      return new Response(JSON.stringify({
        error: "TARGET_DATABASE_URL_EXTERNAL secret missing",
        hint: "Add the connection string for the external project (postgresql://...) as TARGET_DATABASE_URL_EXTERNAL"
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const client = new Client(dbUrl);
    await client.connect();

    const results: Array<Record<string, unknown>> = [];
    for (const sql of SQL_STATEMENTS) {
      try {
        await client.queryArray(sql);
        results.push({ sql, status: "ok" });
      } catch (e) {
        results.push({ sql, status: "error", error: (e as Error).message });
      }
    }
    await client.end();

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
