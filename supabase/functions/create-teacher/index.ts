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

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح - لم يتم تقديم رمز المصادقة");

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("غير مصرح");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "manager"])
      .maybeSingle();

    if (!roleData) throw new Error("غير مصرح - المدير أو المشرف فقط يمكنه إنشاء حسابات");

    const { email, password, full_name, whatsapp, age, hourly_rate, rate_currency, qualification, subjects, gender } = await req.json();

    // Input validation
    if (!whatsapp || typeof whatsapp !== "string" || whatsapp.replace(/[^0-9+]/g, "").length < 8 || whatsapp.length > 20) {
      throw new Error("رقم الواتساب مطلوب وغير صالح");
    }
    if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
      throw new Error("كلمة المرور يجب أن تكون بين 8 و 128 حرف");
    }
    if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0 || full_name.length > 100) {
      throw new Error("الاسم مطلوب ويجب أن يكون أقل من 100 حرف");
    }
    if (age !== null && age !== undefined && (typeof age !== "number" || age < 15 || age > 100)) {
      throw new Error("العمر يجب أن يكون بين 15 و 100");
    }
    if (hourly_rate !== undefined && (typeof hourly_rate !== "number" || hourly_rate < 0 || hourly_rate > 10000)) {
      throw new Error("سعر الساعة غير صالح");
    }
    if (subjects && (!Array.isArray(subjects) || subjects.length > 20)) {
      throw new Error("المواد غير صالحة");
    }

    const sanitizedPhone = whatsapp.replace(/[^0-9+]/g, "").trim();

    // Check if phone already exists in profiles
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("whatsapp", sanitizedPhone)
      .maybeSingle();

    if (existingProfile) {
      throw new Error("رقم الواتساب مسجل بالفعل");
    }

    // Use provided email or generate one from phone number
    const finalEmail = (email && typeof email === "string" && email.includes("@"))
      ? email.trim().toLowerCase()
      : `teacher_${sanitizedPhone.replace(/[^0-9]/g, "")}@alhamdacademy.net`;

    // Create user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: finalEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (createError) throw createError;

    const userId = newUser.user.id;

    // Update profile whatsapp
    await adminClient.from("profiles").update({ whatsapp: sanitizedPhone }).eq("user_id", userId);

    // Assign teacher role
    await adminClient.from("user_roles").insert({ user_id: userId, role: "teacher" });

    // Create teacher record
    await adminClient.from("teachers").insert({
      user_id: userId,
      age: age || null,
      hourly_rate: hourly_rate || 0,
      rate_currency: rate_currency === "EGP" ? "EGP" : "USD",
      qualification: qualification ? String(qualification).slice(0, 200) : null,
      subjects: subjects || [],
      gender: gender === "female" ? "female" : "male",
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
