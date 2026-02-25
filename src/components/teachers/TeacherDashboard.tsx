import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock, Users, DollarSign, TrendingUp, CalendarDays,
  Timer, AlertTriangle, CheckCircle, Video, Loader2,
} from "lucide-react";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState("");
  const [nextSession, setNextSession] = useState<any>(null);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  // Fetch teacher record
  const { data: teacher } = useQuery({
    queryKey: ["teacher-dashboard-profile"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Today's sessions
  const { data: todaySessions = [] } = useQuery({
    queryKey: ["teacher-today-sessions"],
    queryFn: async () => {
      if (!teacher) return [];
      const { data } = await supabase
        .from("sessions")
        .select("*, students:student_id(name)")
        .eq("teacher_id", teacher.id)
        .eq("session_date", today)
        .order("start_time");
      return data ?? [];
    },
    enabled: !!teacher,
  });

  // Monthly stats
  const { data: monthlyStats } = useQuery({
    queryKey: ["teacher-monthly-stats"],
    queryFn: async () => {
      if (!teacher) return null;
      const { data: sessions } = await supabase
        .from("sessions")
        .select("duration_minutes, status, waiting_minutes")
        .eq("teacher_id", teacher.id)
        .gte("session_date", monthStart);

      const completed = (sessions ?? []).filter(s => s.status === "completed");
      const absent = (sessions ?? []).filter(s => s.status === "absent_student");
      const totalHours = completed.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;
      const waitingMin = absent.reduce((sum, s) => sum + (s.waiting_minutes || 0), 0);
      const estimatedSalary = (totalHours * (teacher.hourly_rate || 0)) + ((waitingMin / 60) * (teacher.hourly_rate || 0));

      // Pending reports count
      const { data: reports } = await supabase
        .from("session_reports")
        .select("session_id")
        .eq("teacher_id", teacher.id);
      const reportedIds = new Set((reports ?? []).map(r => r.session_id));

      return {
        totalHours: Math.round(totalHours * 10) / 10,
        completedSessions: completed.length,
        totalSessions: (sessions ?? []).length,
        waitingMinutes: waitingMin,
        estimatedSalary: Math.round(estimatedSalary),
        absenceSessions: absent.length,
      };
    },
    enabled: !!teacher,
  });

  // Students count
  const { data: studentsCount = 0 } = useQuery({
    queryKey: ["teacher-students-count"],
    queryFn: async () => {
      if (!teacher) return 0;
      const { count } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("assigned_teacher_id", teacher.id)
        .eq("is_active", true);
      return count ?? 0;
    },
    enabled: !!teacher,
  });

  // Countdown to next session
  useEffect(() => {
    const upcoming = todaySessions.find(
      (s: any) => s.status === "upcoming" || s.status === "confirmed"
    );
    setNextSession(upcoming);

    if (!upcoming?.start_time) {
      setCountdown("");
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();
      const [h, m] = upcoming.start_time.split(":").map(Number);
      const sessionTime = new Date();
      sessionTime.setHours(h, m, 0, 0);

      const diff = sessionTime.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown(t("sessionStarted") || "بدأت الحصة!");
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${hours > 0 ? hours + ":" : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [todaySessions, t]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    upcoming: { label: t("upcoming"), className: "bg-accent text-accent-foreground" },
    confirmed: { label: t("confirmed"), className: "bg-primary text-primary-foreground" },
    completed: { label: t("completed"), className: "bg-success text-success-foreground" },
    absent_student: { label: t("absent_student"), className: "bg-destructive text-destructive-foreground" },
    postponed: { label: t("postponed"), className: "bg-warning text-warning-foreground" },
  };

  if (!teacher) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Countdown Banner */}
      {nextSession && (
        <Card className="border-primary/20 bg-gradient-to-l from-primary/10 to-primary/5 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Timer className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("nextSession") || "الحصة القادمة"}</p>
                <p className="text-lg font-bold">{nextSession.students?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {nextSession.start_time?.slice(0, 5)} · {nextSession.duration_minutes} {t("minutes")}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-primary tabular-nums" dir="ltr">
                {countdown}
              </p>
              {teacher.zoom_link && (
                <Button
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => window.open(teacher.zoom_link!, "_blank")}
                >
                  <Video className="h-3.5 w-3.5" />
                  {t("joinZoom")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile incomplete alert */}
      {!teacher.profile_completed && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium">{t("completeProfile") || "أكمل ملفك الشخصي"}</p>
              <p className="text-xs text-muted-foreground">{t("completeProfileHint") || "أضف مؤهلاتك وصورتك الشخصية ورابط الزوم"}</p>
            </div>
            <Button size="sm" variant="outline" className="mr-auto" asChild>
              <a href="/my-profile">{t("myProfile")}</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{monthlyStats?.totalHours ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">{t("teachingHours")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold">{monthlyStats?.completedSessions ?? 0}<span className="text-xs text-muted-foreground">/{monthlyStats?.totalSessions ?? 0}</span></p>
              <p className="text-[10px] text-muted-foreground">{t("sessionsCount")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{studentsCount}</p>
              <p className="text-[10px] text-muted-foreground">{t("studentsLabel")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold">${monthlyStats?.estimatedSalary ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">{t("salary")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Sessions */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t("todaySchedule")}
            <Badge variant="secondary" className="text-xs">{todaySessions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">{t("noSessionsToday")}</p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session: any) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                    session.id === nextSession?.id ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {(session.students?.name ?? "?")[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.students?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.start_time?.slice(0, 5) ?? "—"} · {session.duration_minutes} {t("minutes")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={statusConfig[session.status]?.className ?? ""}>
                    {statusConfig[session.status]?.label ?? session.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Summary Bar */}
      {monthlyStats && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">{t("monthlyStats")}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div className="rounded-lg bg-success/5 p-3">
                <p className="text-lg font-bold text-success">{monthlyStats.completedSessions}</p>
                <p className="text-muted-foreground">{t("completed")}</p>
              </div>
              <div className="rounded-lg bg-destructive/5 p-3">
                <p className="text-lg font-bold text-destructive">{monthlyStats.absenceSessions}</p>
                <p className="text-muted-foreground">{t("absence")}</p>
              </div>
              <div className="rounded-lg bg-warning/5 p-3">
                <p className="text-lg font-bold text-warning">{monthlyStats.waitingMinutes}</p>
                <p className="text-muted-foreground">{t("waitingTime")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherDashboard;
