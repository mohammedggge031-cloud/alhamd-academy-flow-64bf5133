import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GREETING = "السلام عليكم ورحمة الله وبركاته";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getTimeInTimezone(date: Date, tz: string): string {
  try {
    return date.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return date.toLocaleTimeString("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hour12: false });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Auth: accept CRON_SECRET header (for pg_cron) or admin/manager JWT
    const cronSecret = Deno.env.get("CRON_SECRET") || "";
    const headerSecret = req.headers.get("x-cron-secret") || "";
    const authHeader = req.headers.get("Authorization") || "";
    let authorized = cronSecret.length > 0 && headerSecret === cronSecret;
    if (!authorized && authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await callerClient.auth.getUser();
      if (user) {
        const { data: roleData } = await adminClient
          .from("user_roles").select("role").eq("user_id", user.id)
          .in("role", ["admin", "manager"]).maybeSingle();
        if (roleData) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: sessions } = await adminClient
      .from("sessions")
      .select(`
        id, session_date, start_time, duration_minutes, status,
        students:student_id(name, whatsapp, guardian_whatsapp, timezone),
        teachers:teacher_id(user_id, profiles:user_id(full_name, whatsapp))
      `)
      .eq("session_date", today)
      .in("status", ["upcoming", "confirmed"]);

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ success: true, created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminManagers } = await adminClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "manager"]);

    const recipientIds = (adminManagers ?? []).map((r: any) => r.user_id);
    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ success: true, created: 0, reason: "no_admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;
    const egyptNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const egyptHours = egyptNow.getHours();
    const egyptMinutes = egyptNow.getMinutes();

    for (const session of sessions) {
      const student = (session as any).students;
      const teacher = (session as any).teachers;
      if (!student || !teacher) continue;

      const startTime = session.start_time || "00:00";
      const [sh, sm] = startTime.split(":").map(Number);
      const sessionMinutes = sh * 60 + sm;
      const nowMinutes = egyptHours * 60 + egyptMinutes;
      const diffMinutes = sessionMinutes - nowMinutes;

      const studentName = student.name || "طالب";
      const teacherName = teacher.profiles?.full_name || "معلم";
      const studentPhone = student.whatsapp || student.guardian_whatsapp || "";
      const teacherPhone = teacher.profiles?.whatsapp || "";
      const timeDisplay = startTime.slice(0, 5);
      const studentTz = student.timezone || "Africa/Cairo";

      // Calculate student local time
      let studentTimeDisplay = timeDisplay;
      let studentTimeLine = "";
      if (studentTz !== "Africa/Cairo") {
        try {
          // Build a Date object for the session in Egypt time
          const sessionDateObj = new Date(`${session.session_date}T${startTime}:00`);
          // Get Egypt offset
          const egyptOffset = new Date(sessionDateObj.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime();
          const studentOffset = new Date(sessionDateObj.toLocaleString("en-US", { timeZone: studentTz })).getTime();
          const diffMs = studentOffset - egyptOffset;
          const diffHrs = diffMs / 3600000;
          const studentSessionTime = new Date(sessionDateObj.getTime() + diffMs);
          studentTimeDisplay = studentSessionTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
          studentTimeLine = `\n🌍 بتوقيتك: ${studentTimeDisplay} · بتوقيت مصر: ${timeDisplay}`;
        } catch {
          studentTimeLine = "";
        }
      }

      // 6 hour reminder
      if (diffMinutes >= 330 && diffMinutes <= 390) {
        const studentMsg = `🕌 *تذكير بحصة اليوم - أكاديمية الحمد*\n\n${GREETING} يا ${studentName} 🌟\n\n📅 موعد الحصة اليوم${studentTimeLine || `\n⏰ الساعة: ${timeDisplay}`}\n👨‍🏫 المعلم: ${teacherName}\n⏱ المدة: ${session.duration_minutes} دقيقة\n\nنتمنى لك حصة موفقة! 📚`;
        const teacherMsg = `🕌 *تذكير بحصة اليوم - أكاديمية الحمد*\n\n${GREETING} يا ${teacherName}\n\n📅 موعد الحصة اليوم\n⏰ الساعة: ${timeDisplay} (توقيت مصر)\n👤 الطالب: ${studentName}\n⏱ المدة: ${session.duration_minutes} دقيقة\n\nجزاك الله خيراً 📚`;

        const { data: existing } = await adminClient
          .from("notifications")
          .select("id")
          .eq("type", "session_reminder_6h")
          .contains("metadata", { session_id: session.id })
          .limit(1);

        if (!existing || existing.length === 0) {
          const groupId = crypto.randomUUID();
          const notifications = recipientIds.map((uid: string) => ({
            user_id: uid,
            type: "session_reminder_6h",
            title: `⏰ تذكير: حصة ${studentName} الساعة ${timeDisplay}`,
            body: `المعلم: ${teacherName} · المدة: ${session.duration_minutes} دقيقة`,
            group_id: groupId,
            metadata: {
              session_id: session.id,
              whatsapp_phone: studentPhone,
              whatsapp_message: studentMsg,
              whatsapp_label: `تذكير ${studentName}`,
              whatsapp_phone_2: teacherPhone,
              whatsapp_message_2: teacherMsg,
              whatsapp_label_2: `تذكير ${teacherName}`,
            },
          }));
          await adminClient.from("notifications").insert(notifications);
          created += notifications.length;
        }
      }

      // 5 minute reminder
      if (diffMinutes >= 3 && diffMinutes <= 7) {
        const studentMsg = `🔔 *الحصة بعد دقائق! - أكاديمية الحمد*\n\n${GREETING} يا ${studentName}\n\n⏰ الحصة الساعة ${studentTimeLine ? studentTimeDisplay : timeDisplay}${studentTimeLine ? ` (بتوقيتك)` : ""}\n👨‍🏫 المعلم: ${teacherName}\n\nيرجى الاستعداد الآن! 🚀`;
        const teacherMsg = `🔔 *الحصة بعد دقائق! - أكاديمية الحمد*\n\n${GREETING} يا ${teacherName}\n\n⏰ الحصة الساعة ${timeDisplay} (توقيت مصر)\n👤 الطالب: ${studentName}\n\nيرجى الاستعداد الآن! 🚀`;

        const { data: existing } = await adminClient
          .from("notifications")
          .select("id")
          .eq("type", "session_reminder_5m")
          .contains("metadata", { session_id: session.id })
          .limit(1);

        if (!existing || existing.length === 0) {
          const groupId = crypto.randomUUID();
          const notifications = recipientIds.map((uid: string) => ({
            user_id: uid,
            type: "session_reminder_5m",
            title: `🔔 الحصة بعد دقائق: ${studentName} الساعة ${timeDisplay}`,
            body: `المعلم: ${teacherName} · يرجى التنبيه الآن`,
            group_id: groupId,
            metadata: {
              session_id: session.id,
              whatsapp_phone: studentPhone,
              whatsapp_message: studentMsg,
              whatsapp_label: `تنبيه ${studentName}`,
              whatsapp_phone_2: teacherPhone,
              whatsapp_message_2: teacherMsg,
              whatsapp_label_2: `تنبيه ${teacherName}`,
            },
          }));
          await adminClient.from("notifications").insert(notifications);
          created += notifications.length;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, created }), {
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
