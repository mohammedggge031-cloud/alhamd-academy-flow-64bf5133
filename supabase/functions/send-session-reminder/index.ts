import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsApp(phone: string, message: string, apiKey: string, phoneId: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: message },
      }),
    }
  );
  return res;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { type, session_id } = await req.json();

    const whatsappApiKey = Deno.env.get("WHATSAPP_API_KEY");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_ID");

    if (type === "daily_reminder") {
      // Send reminders for all today's sessions
      const today = new Date().toISOString().split("T")[0];
      const { data: sessions, error } = await adminClient
        .from("sessions")
        .select("id, session_date, start_time, duration_minutes, student_id, students:student_id(name, whatsapp, guardian_whatsapp), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .eq("session_date", today)
        .in("status", ["upcoming", "confirmed"]);

      if (error) throw error;
      if (!sessions || sessions.length === 0) {
        return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_sessions_today" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sentCount = 0;
      for (const session of sessions) {
        const student = (session as any).students;
        const teacher = (session as any).teachers;
        if (!student) continue;

        const phone = student.whatsapp || student.guardian_whatsapp;
        if (!phone) continue;

        const teacherName = teacher?.profiles?.full_name || "المعلم";
        const time = session.start_time?.slice(0, 5) || "";
        const message = `🕌 *تذكير بحصة اليوم - أكاديمية الحمد*\n\nالسلام عليكم يا ${student.name} 🌟\n\n📅 موعد الحصة اليوم: ${time}\n👨‍🏫 المعلم: ${teacherName}\n⏱ المدة: ${session.duration_minutes} دقيقة\n\nنتمنى لك حصة موفقة! 📚`;

        if (whatsappApiKey && whatsappPhoneId) {
          await sendWhatsApp(phone, message, whatsappApiKey, whatsappPhoneId);
          sentCount++;
        } else {
          console.log(`[Daily Reminder] ${student.name}: ${message}`);
          sentCount++;
        }
      }

      return new Response(JSON.stringify({ success: true, sent: sentCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (type === "teacher_joined") {
      // Teacher confirmed/joined - remind student now
      if (!session_id) throw new Error("session_id required for teacher_joined");

      const { data: session, error } = await adminClient
        .from("sessions")
        .select("id, start_time, duration_minutes, student_id, students:student_id(name, whatsapp, guardian_whatsapp), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .eq("id", session_id)
        .single();

      if (error || !session) throw new Error("Session not found");

      const student = (session as any).students;
      const teacher = (session as any).teachers;
      if (!student) throw new Error("Student not found");

      const phone = student.whatsapp || student.guardian_whatsapp;
      if (!phone) {
        return new Response(JSON.stringify({ success: true, whatsapp_sent: false, reason: "no_phone" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const teacherName = teacher?.profiles?.full_name || "المعلم";
      const message = `🔔 *المعلم دخل الحصة الآن!*\n\nالسلام عليكم يا ${student.name}\n\n👨‍🏫 المعلم ${teacherName} في انتظارك الآن\n⏱ المدة: ${session.duration_minutes} دقيقة\n\nيرجى الدخول فوراً 🚀`;

      if (whatsappApiKey && whatsappPhoneId) {
        await sendWhatsApp(phone, message, whatsappApiKey, whatsappPhoneId);
      } else {
        console.log(`[Teacher Joined] ${student.name}: ${message}`);
      }

      return new Response(JSON.stringify({ success: true, whatsapp_sent: !!whatsappApiKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type. Use 'daily_reminder' or 'teacher_joined'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
