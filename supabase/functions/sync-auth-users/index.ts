import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_URL = "https://euwotooilvdahnuovvzr.supabase.co";

// Users to provision on target. Same UUIDs as source so FKs line up.
const USERS: Array<{
  id: string;
  email: string;
  phone?: string;
  password: string;
  full_name: string;
}> = [
  {
    id: "b57a7464-0bbe-4c7b-93e9-b400bc25b244",
    email: "info@alhamdacademy.net",
    password: "Alhamd@2025!Admin",
    full_name: "المدير",
  },
  {
    id: "ef272de6-8463-46bf-82d1-d4f13dae89a3",
    email: "admin@alhamdacademy.net",
    password: "Alhamd@2025!Manager",
    full_name: "مشرف الأكاديمية",
  },
  {
    id: "fc013ac3-ff32-4234-a8a1-7caf35eeda2d",
    email: "teacher_201234567890@alhamdacademy.net",
    password: "Alhamd@2025!Teacher",
    full_name: "معلم اختبار",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const targetServiceRoleKey = Deno.env.get("TARGET_SERVICE_ROLE_KEY") || "";
    if (!targetServiceRoleKey) throw new Error("TARGET_SERVICE_ROLE_KEY not configured");

    const target = createClient(TARGET_URL, targetServiceRoleKey);

    const results: Array<Record<string, unknown>> = [];

    for (const u of USERS) {
      // Check if user already exists by id
      const { data: existing } = await target.auth.admin.getUserById(u.id);
      if (existing?.user) {
        results.push({ email: u.email, status: "exists" });
        continue;
      }

      // Try to create with explicit id
      const { data, error } = await (target.auth.admin.createUser as any)({
        id: u.id,
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, email_verified: true },
      });

      if (error) {
        results.push({ email: u.email, status: "error", error: error.message });
      } else {
        results.push({ email: u.email, status: "created", id: data.user?.id });
      }
    }

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
