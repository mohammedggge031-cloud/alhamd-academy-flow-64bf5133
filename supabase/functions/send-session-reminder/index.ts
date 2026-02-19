import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatTimeInTz(time: string, date: string, tz: string): string {
  try {
    const dt = new Date(`${date}T${time}`);
    return dt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz });
  } catch {
    return time?.slice(0, 5) || "";
  }
}

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

async function trySend(phone: string, message: string, apiKey: string | undefined, phoneId: string | undefined, label: string) {
  if (apiKey && phoneId) {
    const res = await sendWhatsApp(phone, message, apiKey, phoneId);
    if (!res.ok) {
      const err = await res.json();
      console.error(`[${label}] WhatsApp error:`, err);
    }
    return true;
  } else {
    console.log(`[${label}] API not configured. Message: ${message}`);
    return false;
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

    const body = await req.json();
    const { type, session_id } = body;

    const whatsappApiKey = Deno.env.get("WHATSAPP_API_KEY");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_ID");

    // ─── DAILY SESSION REMINDER ───
    if (type === "daily_reminder") {
      const today = new Date().toISOString().split("T")[0];
      const { data: sessions } = await adminClient
        .from("sessions")
        .select("id, session_date, start_time, duration_minutes, student_id, students:student_id(name, whatsapp, guardian_whatsapp, timezone), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .eq("session_date", today)
        .in("status", ["upcoming", "confirmed"]);

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
        const studentTz = student.timezone || "Africa/Cairo";
        const timeStr = session.start_time || "00:00";
        const studentTime = formatTimeInTz(timeStr, today, studentTz);
        const egyptTime = formatTimeInTz(timeStr, today, "Africa/Cairo");

        const message = `🕌 *تذكير بحصة اليوم - أكاديمية الحمد*\n\nالسلام عليكم يا ${student.name} 🌟\n\n📅 موعد الحصة اليوم:\n⏰ بتوقيتك: ${studentTime}\n🇪🇬 بتوقيت مصر: ${egyptTime}\n👨‍🏫 المعلم: ${teacherName}\n⏱ المدة: ${session.duration_minutes} دقيقة\n\nنتمنى لك حصة موفقة! 📚`;

        await trySend(phone, message, whatsappApiKey, whatsappPhoneId, "Daily Reminder");
        sentCount++;
      }

      return new Response(JSON.stringify({ success: true, sent: sentCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── TEACHER JOINED ───
    if (type === "teacher_joined") {
      if (!session_id) throw new Error("session_id required");

      const { data: session } = await adminClient
        .from("sessions")
        .select("id, session_date, start_time, duration_minutes, student_id, students:student_id(name, whatsapp, guardian_whatsapp, timezone), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .eq("id", session_id)
        .single();

      if (!session) throw new Error("Session not found");

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

      const sent = await trySend(phone, message, whatsappApiKey, whatsappPhoneId, "Teacher Joined");

      return new Response(JSON.stringify({ success: true, whatsapp_sent: sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── INVOICE REMINDERS ───
    if (type === "invoice_reminders") {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      let sentCount = 0;

      // 1. Invoices due tomorrow (24h before)
      const { data: dueTomorrow } = await adminClient
        .from("invoices")
        .select("id, total, due_date, student_id, students:student_id(name, whatsapp, guardian_whatsapp)")
        .eq("due_date", tomorrow)
        .eq("status", "pending");

      if (dueTomorrow) {
        for (const inv of dueTomorrow) {
          const student = (inv as any).students;
          if (!student) continue;
          const phone = student.whatsapp || student.guardian_whatsapp;
          if (!phone) continue;
          const message = `⏰ *تذكير بموعد السداد - أكاديمية الحمد*\n\nالسلام عليكم يا ${student.name}\n\n💳 لديك فاتورة مستحقة غداً بمبلغ $${inv.total}\n📅 تاريخ الاستحقاق: ${inv.due_date}\n\nيرجى السداد في الموعد لضمان استمرار الحصص 🙏`;
          await trySend(phone, message, whatsappApiKey, whatsappPhoneId, "Invoice Due Tomorrow");
          sentCount++;
        }
      }

      // 2. Invoices overdue since yesterday (24h late)
      const { data: overdue } = await adminClient
        .from("invoices")
        .select("id, total, due_date, student_id, students:student_id(name, whatsapp, guardian_whatsapp)")
        .eq("due_date", yesterday)
        .eq("status", "pending");

      if (overdue) {
        for (const inv of overdue) {
          // Mark as overdue
          await adminClient.from("invoices").update({ status: "overdue" }).eq("id", inv.id);

          const student = (inv as any).students;
          if (!student) continue;
          const phone = student.whatsapp || student.guardian_whatsapp;
          if (!phone) continue;
          const message = `🔴 *تنبيه تأخر السداد - أكاديمية الحمد*\n\nالسلام عليكم يا ${student.name}\n\n⚠️ لديك فاتورة متأخرة بمبلغ $${inv.total}\n📅 كان الموعد: ${inv.due_date}\n\nيرجى التواصل مع الإدارة للسداد في أقرب وقت 📞`;
          await trySend(phone, message, whatsappApiKey, whatsappPhoneId, "Invoice Overdue");
          sentCount++;
        }
      }

      // 3. Students with only 1 session remaining (before last session)
      const { data: lowBalance } = await adminClient
        .from("students")
        .select("id, name, whatsapp, guardian_whatsapp, remaining_hours, session_duration_minutes")
        .eq("is_active", true);

      if (lowBalance) {
        for (const student of lowBalance) {
          const remaining = Number(student.remaining_hours) || 0;
          const sessionHours = (Number(student.session_duration_minutes) || 60) / 60;
          // If exactly 1 session remaining (between 0 exclusive and 1 session inclusive)
          if (remaining > 0 && remaining <= sessionHours) {
            const phone = student.whatsapp || student.guardian_whatsapp;
            if (!phone) continue;
            const message = `⚠️ *تنبيه رصيد الساعات - أكاديمية الحمد*\n\nالسلام عليكم يا ${student.name}\n\n📊 تبقى لك حصة واحدة فقط!\n⏱ الرصيد المتبقي: ${remaining} ساعة\n\nيرجى تجديد الباقة لضمان استمرار الحصص 💪`;
            await trySend(phone, message, whatsappApiKey, whatsappPhoneId, "Low Balance");
            sentCount++;
          }
        }
      }

      return new Response(JSON.stringify({ success: true, sent: sentCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type. Use 'daily_reminder', 'teacher_joined', or 'invoice_reminders'" }), {
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
