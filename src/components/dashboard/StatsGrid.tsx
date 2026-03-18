import { memo } from "react";
import { Users, GraduationCap, Receipt, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const StatsGrid = memo(() => {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const students = useQuery({
    queryKey: ["dash-students"],
    retry: 1,
    queryFn: async () => {
      const { count, error } = await supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true);
      if (error) { console.error("dash-students error:", error); throw error; }
      return count ?? 0;
    },
  });

  const teachers = useQuery({
    queryKey: ["dash-teachers"],
    retry: 1,
    queryFn: async () => {
      const { count, error } = await supabase.from("teachers").select("*", { count: "exact", head: true }).eq("is_active", true);
      if (error) { console.error("dash-teachers error:", error); throw error; }
      return count ?? 0;
    },
  });

  const invoices = useQuery({
    queryKey: ["dash-due-invoices"],
    retry: 1,
    queryFn: async () => {
      const { count, error } = await supabase.from("invoices").select("*", { count: "exact", head: true }).eq("status", "pending").lte("due_date", today);
      if (error) { console.error("dash-invoices error:", error); throw error; }
      return count ?? 0;
    },
  });

  const hours = useQuery({
    queryKey: ["dash-monthly-hours"],
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("duration_minutes").eq("status", "completed").gte("session_date", monthStart);
      if (error) { console.error("dash-hours error:", error); throw error; }
      return data ? Math.round(data.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60) : 0;
    },
  });

  const queries = [students, teachers, invoices, hours];
  const anyLoading = queries.some((q) => q.isLoading);
  const anyError = queries.some((q) => q.isError);

  const stats = [
    { label: t("dashActiveStudents"), value: String(students.data ?? 0), icon: Users, trend: "" },
    { label: t("dashTeachers"), value: String(teachers.data ?? 0), icon: GraduationCap, trend: t("dashActiveLabel") },
    { label: t("dashDueInvoices"), value: String(invoices.data ?? 0), icon: Receipt, trend: "" },
    { label: t("dashMonthlyHours"), value: String(hours.data ?? 0), icon: Clock, trend: "" },
  ];

  if (anyLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-none shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
              <stat.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{anyError ? "—" : stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              {stat.trend && !anyError && (
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
