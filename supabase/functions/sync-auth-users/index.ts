import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_URL = "https://euwotooilvdahnuovvzr.supabase.co";
const TARGET_ADMIN_ID = "b57a7464-0bbe-4c7b-93e9-b400bc25b244";
const ADMIN_EMAIL = "info@alhamdacademy.net";
const ADMIN_PASSWORD = "Alhamd@2025!Admin";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = Deno.env.get("TARGET_SERVICE_ROLE_KEY") || "";
    if (!key) throw new Error("TARGET_SERVICE_ROLE_KEY missing");
    const target = createClient(TARGET_URL, key);

    // List users to find existing admin email
    const { data: list, error: listErr } = await target.auth.admin.listUsers({ perPage: 200 });
    if (listErr) throw listErr;

    const existing = list.users.find((u) => u.email === ADMIN_EMAIL);
    const log: string[] = [];

    if (existing && existing.id !== TARGET_ADMIN_ID) {
      log.push(`Found admin with mismatched id ${existing.id}, deleting...`);
      // Clean profiles/user_roles in target referencing old id
      await target.from("user_roles").delete().eq("user_id", existing.id);
      await target.from("profiles").delete().eq("user_id", existing.id);
      const { error: delErr } = await target.auth.admin.deleteUser(existing.id);
      if (delErr) throw new Error(`delete failed: ${delErr.message}`);
      log.push("Deleted old admin user");
    } else if (existing && existing.id === TARGET_ADMIN_ID) {
      log.push("Admin already correct, nothing to do");
      return new Response(JSON.stringify({ success: true, log }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create with explicit id
    const { data, error } = await (target.auth.admin.createUser as any)({
      id: TARGET_ADMIN_ID,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "المدير", email_verified: true },
    });
    if (error) throw error;
    log.push(`Created admin with id ${data.user?.id}`);

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
