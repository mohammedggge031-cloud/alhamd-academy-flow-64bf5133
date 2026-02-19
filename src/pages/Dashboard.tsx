import {
  Users,
  GraduationCap,
  Receipt,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";

const Dashboard = () => {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const statusMap: Record<string, { label: string; className: string }> = {
    upcoming: { label: t("upcoming"), className: "bg-accent text-accent-foreground" },
    confirmed: { label: t("confirmed"), className: "bg-primary text-primary-foreground" },
    completed: { label: t("completed"), className: "bg-success text-success-foreground" },
    cancelled: { label: t("cancelled"), className: "bg-destructive text-destructive-foreground" },
    absent_student: { label: t("absent_student"), className: "bg-destructive text-destructive-foreground" },
    postponed: { label: t("postponed"), className: "bg-warning text-warning-foreground" },
  };

  const { data: activeStudents = 0 } = useQuery({
    queryKey: ["dash-students"],
    queryFn: async () => {
      const { count } = await supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count ?? 0;
    },
  });

  const { data: teacherCount = 0 } = useQuery({
    queryKey: ["dash-teachers"],
    queryFn: async () => {
      const { count } = await supabase.from("teachers").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count ?? 0;
    },
  });

  const { data: dueInvoices = 0 } = useQuery({
    queryKey: ["dash-due-invoices"],
    queryFn: async () => {
      const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true }).eq("status", "pending").lte("due_date", today);
      return count ?? 0;
    },
  });

  const { data: monthlyHours = 0 } = useQuery({
    queryKey: ["dash-monthly-hours"],
    queryFn: async () => {
      const { data } = await supabase.from("sessions").select("duration_minutes").eq("status", "completed").gte("session_date", monthStart);
      return data ? Math.round(data.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60) : 0;
    },
  });

  const { data: todaySessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["dash-today-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*, students:student_id(name), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .eq("session_date", today)
        .order("start_time");
      return data ?? [];
    },
  });

  const { data: overdueInvoices = [] } = useQuery({
    queryKey: ["dash-overdue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, students:student_id(name)")
        .eq("status", "pending")
        .lt("due_date", today)
        .order("due_date")
        .limit(5);
      return data ?? [];
    },
  });

  const { data: lowBalance = [] } = useQuery({
    queryKey: ["dash-low-balance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("name, remaining_hours, session_duration_minutes")
        .eq("is_active", true)
        .lte("remaining_hours", 1)
        .order("remaining_hours");
      return data ?? [];
    },
  });

  const stats = [
    { label: t("dashActiveStudents"), value: String(activeStudents), icon: Users, trend: "" },
    { label: t("dashTeachers"), value: String(teacherCount), icon: GraduationCap, trend: t("dashActiveLabel") },
    { label: t("dashDueInvoices"), value: String(dueInvoices), icon: Receipt, trend: "" },
    { label: t("dashMonthlyHours"), value: String(monthlyHours), icon: Clock, trend: "" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t("navDashboard")}</h1>
        <p className="text-muted-foreground">{t("dashWelcome")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.trend && (
                  <p className="mt-0.5 text-xs text-primary flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              {t("dashTodaySessions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : todaySessions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{t("dashNoSessions")}</p>
            ) : (
              <div className="space-y-3">
                {todaySessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {(session.students?.name ?? "?")[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{session.students?.name}</p>
                        <p className="text-xs text-muted-foreground">{session.teachers?.profiles?.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{session.start_time?.slice(0, 5) ?? "—"}</span>
                      <Badge variant="secondary" className={statusMap[session.status]?.className ?? ""}>
                        {statusMap[session.status]?.label ?? session.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {t("dashOverdueInvoices")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueInvoices.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-3">{t("dashNoOverdue")}</p>
              ) : overdueInvoices.map((inv: any) => {
                const days = Math.ceil((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
                return (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium">{inv.students?.name}</p>
                      <p className="text-xs text-muted-foreground">{days} {t("dashOverdueDays")}</p>
                    </div>
                    <span className="text-sm font-bold text-destructive">${inv.total}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-warning" />
                {t("dashLowBalance")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowBalance.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-3">{t("dashNoLowBalance")}</p>
              ) : lowBalance.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">{s.name}</p>
                  <Badge variant="secondary" className="bg-warning/10 text-warning">
                    {s.remaining_hours} {t("hour")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
