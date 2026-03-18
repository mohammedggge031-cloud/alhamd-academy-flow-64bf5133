import { Navigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import StatsGrid from "@/components/dashboard/StatsGrid";
import TodaySessions from "@/components/dashboard/TodaySessions";
import AlertCards from "@/components/dashboard/AlertCards";
import RecentActivity from "@/components/dashboard/RecentActivity";

const Dashboard = () => {
  const { t } = useLanguage();
  const { role } = useAuth();

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
        <AlertCards />
      </div>

      <RecentActivity />
    </div>
  );
};

export default Dashboard;
