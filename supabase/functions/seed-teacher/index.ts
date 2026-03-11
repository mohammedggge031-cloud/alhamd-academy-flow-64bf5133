import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, password, full_name, whatsapp, age, hourly_rate, qualification, subjects, gender, bio, academic_degree, ijazat } = await req.json();

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) throw createError;

    const userId = newUser.user.id;

    if (whatsapp) {
      await adminClient.from("profiles").update({ whatsapp }).eq("user_id", userId);
    }

    await adminClient.from("user_roles").insert({ user_id: userId, role: "teacher" });

    await adminClient.from("teachers").insert({
      user_id: userId,
      age: age || null,
      hourly_rate: hourly_rate || 0,
      qualification: qualification || null,
      subjects: subjects || [],
      gender: gender || "male",
      bio: bio || null,
      academic_degree: academic_degree || null,
      ijazat: ijazat || null,
    });

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
