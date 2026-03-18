import { memo } from "react";
import { Users, GraduationCap, Receipt, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const StatsGrid = memo(() => {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

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

  const stats = [
    { label: t("dashActiveStudents"), value: String(activeStudents), icon: Users, trend: "" },
    { label: t("dashTeachers"), value: String(teacherCount), icon: GraduationCap, trend: t("dashActiveLabel") },
    { label: t("dashDueInvoices"), value: String(dueInvoices), icon: Receipt, trend: "" },
    { label: t("dashMonthlyHours"), value: String(monthlyHours), icon: Clock, trend: "" },
  ];

  return (
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
  );
});

StatsGrid.displayName = "StatsGrid";
export default StatsGrid;
