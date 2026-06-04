import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require either CRON_SECRET (for pg_cron / scheduled invocations) or admin JWT
    const cronSecret = Deno.env.get("CRON_SECRET") || "";
    const providedSecret = req.headers.get("x-cron-secret") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const hasValidCron = cronSecret.length > 0 && providedSecret === cronSecret;
    let isAdmin = false;

    if (!hasValidCron) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await callerClient.auth.getUser();
        if (user) {
          const admin = createClient(supabaseUrl, serviceRoleKey);
          const { data: roles } = await admin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
        }
      }
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);


    // Determine "today" in Africa/Cairo
    const now = new Date();
    const cairoNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const todayDate = cairoNow.toISOString().split("T")[0]; // YYYY-MM-DD
    const todayDayName = DAY_NAMES[cairoNow.getDay()];

    // Optional override (for manual back-fill: ?date=YYYY-MM-DD)
    let targetDate = todayDate;
    let targetDayName = todayDayName;
    try {
      const url = new URL(req.url);
      const override = url.searchParams.get("date");
      if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
        targetDate = override;
        const d = new Date(`${override}T12:00:00Z`);
        targetDayName = DAY_NAMES[d.getUTCDay()];
      }
    } catch { /* ignore */ }

    // Fetch active students with a schedule + assigned teacher
    const { data: students, error: studentsErr } = await admin
      .from("students")
      .select("id, assigned_teacher_id, schedule, session_duration_minutes, is_active")
      .eq("is_active", true)
      .not("assigned_teacher_id", "is", null);
    if (studentsErr) throw studentsErr;

    // Fetch existing sessions for that date to avoid duplicates
    const { data: existingSessions, error: existingErr } = await admin
      .from("sessions")
      .select("student_id, teacher_id, start_time")
      .eq("session_date", targetDate);
    if (existingErr) throw existingErr;

    const existsKey = new Set(
      (existingSessions ?? []).map((s: any) =>
        `${s.student_id}|${s.teacher_id}|${(s.start_time ?? "").slice(0, 5)}`
      )
    );

    const toInsert: any[] = [];
    let scanned = 0;
    let skippedDuplicate = 0;

    for (const st of students ?? []) {
      const schedule = Array.isArray(st.schedule) ? st.schedule : [];
      if (schedule.length === 0) continue;
      scanned++;

      for (const entry of schedule) {
        const day = String(entry?.day ?? "").toLowerCase().trim();
        const time = String(entry?.time ?? "").trim();
        if (!day || !time) continue;
        if (day !== targetDayName) continue;

        const timeKey = time.slice(0, 5);
        const key = `${st.id}|${st.assigned_teacher_id}|${timeKey}`;
        if (existsKey.has(key)) { skippedDuplicate++; continue; }

        toInsert.push({
          student_id: st.id,
          teacher_id: st.assigned_teacher_id,
          session_date: targetDate,
          start_time: time.length === 5 ? `${time}:00` : time,
          duration_minutes: st.session_duration_minutes ?? 60,
          status: "upcoming",
        });
        existsKey.add(key); // guard within this run
      }
    }

    let created = 0;
    if (toInsert.length > 0) {
      const { error: insertErr, data: inserted } = await admin
        .from("sessions")
        .insert(toInsert)
        .select("id");
      if (insertErr) throw insertErr;
      created = inserted?.length ?? 0;
    }

    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      day: targetDayName,
      students_scanned: scanned,
      created,
      skipped_duplicate: skippedDuplicate,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("auto-create-daily-sessions error:", error);
    return new Response(JSON.stringify({ error: error.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
