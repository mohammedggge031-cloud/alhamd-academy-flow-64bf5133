import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import StatsGrid from "@/components/dashboard/StatsGrid";
import TodaySessions from "@/components/dashboard/TodaySessions";
import AlertCards from "@/components/dashboard/AlertCards";
import RecentActivity from "@/components/dashboard/RecentActivity";
import TimezoneWidget from "@/components/dashboard/TimezoneWidget";
import SessionsChart from "@/components/dashboard/SessionsChart";
import SessionCompletionDonut from "@/components/dashboard/SessionCompletionDonut";
import QuickActions from "@/components/dashboard/QuickActions";

// All dashboard query key prefixes for bulk invalidation
export const DASHBOARD_QUERY_KEYS = [
  "dash-students", "dash-teachers", "dash-due-invoices", "dash-monthly-hours",
  "dash-today-sessions", "dash-overdue", "dash-low-balance",
  "dash-recent-bookings", "dash-recent-subs", "sidebar-unread",
  "dash-sessions-chart", "dash-completion-donut",
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

  // Refresh on focus / route entry (Realtime disabled for PII per project policy)
  useEffect(() => {
    invalidateDashboardQueries(queryClient);
    const onFocus = () => invalidateDashboardQueries(queryClient);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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

      <QuickActions />

      <div className="grid gap-6 lg:grid-cols-3">
        <TodaySessions />
        <div className="space-y-6">
          <TimezoneWidget />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SessionsChart />
        <SessionCompletionDonut />
      </div>

      <AlertCards />

      <RecentActivity />
    </div>
  );
};

export default Dashboard;
