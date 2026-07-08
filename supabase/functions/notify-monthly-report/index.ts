import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GREETING = "السلام عليكم ورحمة الله وبركاته";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Require authenticated caller (teacher/manager/admin) to prevent notification injection
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "manager", "teacher"])
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { report_id, student_name, teacher_name, report_month, overall_grade, student_phone } = await req.json();

    if (!report_id || !student_name || !teacher_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminManagers } = await adminClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "manager"]);

    const recipientIds = (adminManagers ?? []).map((r: any) => r.user_id);
    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ success: true, created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthDisplay = report_month ? new Date(report_month).toLocaleDateString("ar-EG", { year: "numeric", month: "long" }) : "";

    let whatsappMsg = `📋 *التقرير الشهري - أكاديمية الحمد*\n\n${GREETING}\n\n`;
    whatsappMsg += `👤 الطالب: ${student_name}\n`;
    whatsappMsg += `👨‍🏫 المعلم: ${teacher_name}\n`;
    whatsappMsg += `📅 الشهر: ${monthDisplay}\n`;
    if (overall_grade) whatsappMsg += `📊 التقييم العام: ${overall_grade}\n`;
    whatsappMsg += `\nيرجى مراجعة التقرير الشهري لمتابعة تقدم الطالب 📖\n\n_أكاديمية الحمد لتحفيظ القرآن الكريم_`;

    const groupId = crypto.randomUUID();
    const notifications = recipientIds.map((uid: string) => ({
      user_id: uid,
      type: "monthly_report",
      title: `📋 تقرير شهري جديد: ${student_name}`,
      body: `المعلم: ${teacher_name} · ${monthDisplay}${overall_grade ? ` · التقييم: ${overall_grade}` : ""}`,
      group_id: groupId,
      metadata: {
        report_id,
        whatsapp_phone: student_phone || "",
        whatsapp_message: whatsappMsg,
        whatsapp_label: `إرسال لـ ${student_name}`,
      },
    }));

    await adminClient.from("notifications").insert(notifications);

    return new Response(JSON.stringify({ success: true, created: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
