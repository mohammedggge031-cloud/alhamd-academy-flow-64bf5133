import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatsGrid from "@/components/dashboard/StatsGrid";
import TodaySessions from "@/components/dashboard/TodaySessions";
import AlertCards from "@/components/dashboard/AlertCards";
import RecentActivity from "@/components/dashboard/RecentActivity";
import TimezoneWidget from "@/components/dashboard/TimezoneWidget";

// All dashboard query key prefixes for bulk invalidation
export const DASHBOARD_QUERY_KEYS = [
  "dash-students", "dash-teachers", "dash-due-invoices", "dash-monthly-hours",
  "dash-today-sessions", "dash-overdue", "dash-low-balance",
  "dash-recent-bookings", "dash-recent-subs", "sidebar-unread",
];

export function invalidateDashboardQueries(queryClient: ReturnType<typeof useQueryClient>) {
  DASHBOARD_QUERY_KEYS.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
}

const Dashboard = () => {
  const { t } = useLanguage();
  const { role } = useAuth();
  const queryClient = useQueryClient();

  // Realtime: auto-refresh dashboard when any relevant table changes
  useEffect(() => {
    const tables = ["students", "teachers", "sessions", "invoices", "trial_bookings", "subscription_requests"];
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => invalidateDashboardQueries(queryClient))
      .on("postgres_changes", { event: "*", schema: "public", table: "teachers" }, () => invalidateDashboardQueries(queryClient))
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => invalidateDashboardQueries(queryClient))
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => invalidateDashboardQueries(queryClient))
      .on("postgres_changes", { event: "*", schema: "public", table: "trial_bookings" }, () => invalidateDashboardQueries(queryClient))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_requests" }, () => invalidateDashboardQueries(queryClient))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  if (role === "teacher") {
    return <Navigate to="/teacher-home" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t("navDashboard")}</h1>
        <p className="text-muted-foreground">{t("dashWelcome")}</p>
      </div>

      <StatsGrid />

      <div className="grid gap-6 lg:grid-cols-3">
        <TodaySessions />
        <div className="space-y-6">
          <TimezoneWidget />
        </div>
      </div>

      <AlertCards />

      <RecentActivity />
    </div>
  );
};

export default Dashboard;
