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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { phone, password } = await req.json();

    // Input validation
    if (!phone || typeof phone !== "string" || phone.length < 8 || phone.length > 20) {
      throw new Error("رقم الموبايل غير صالح");
    }
    if (!password || typeof password !== "string" || password.length < 1 || password.length > 128) {
      throw new Error("كلمة المرور مطلوبة");
    }

    // Sanitize phone - only allow digits and +
    const sanitizedPhone = phone.replace(/[^0-9+]/g, "");

    // Find user by whatsapp number in profiles
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("whatsapp", sanitizedPhone)
      .maybeSingle();

    if (!profile) throw new Error("بيانات الدخول غير صحيحة");

    // Get user email from auth
    const { data: { user } } = await adminClient.auth.admin.getUserById(profile.user_id);
    if (!user) throw new Error("بيانات الدخول غير صحيحة");

    // Sign in with the user's email and provided password
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const signInClient = createClient(supabaseUrl, anonKey);
    const { data: signInData, error: signInError } = await signInClient.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) throw new Error("بيانات الدخول غير صحيحة");

    return new Response(JSON.stringify({
      success: true,
      session: signInData.session,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
