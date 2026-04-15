import { memo } from "react";
import { UserPlus, CalendarPlus, Receipt, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const QuickActions = memo(() => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { role } = useAuth();

  const actions = [
    {
      label: t("addStudent"),
      icon: UserPlus,
      onClick: () => navigate("/students?action=add"),
      color: "bg-primary/10 text-primary hover:bg-primary/20",
      roles: ["admin", "manager"],
    },
    {
      label: t("dashAddSession"),
      icon: CalendarPlus,
      onClick: () => navigate("/sessions?action=add"),
      color: "bg-success/10 text-success hover:bg-success/20",
      roles: ["admin", "manager"],
    },
    {
      label: t("dashAddInvoice"),
      icon: Receipt,
      onClick: () => navigate("/invoices?action=add"),
      color: "bg-warning/10 text-warning hover:bg-warning/20",
      roles: ["admin"],
    },
    {
      label: t("dashViewReports"),
      icon: FileText,
      onClick: () => navigate("/reports"),
      color: "bg-accent text-accent-foreground hover:bg-accent/80",
      roles: ["admin"],
    },
    {
      label: t("dashExportData"),
      icon: Download,
      onClick: () => navigate("/reports?tab=export"),
      color: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      roles: ["admin"],
    },
  ];

  const visibleActions = actions.filter((a) => a.roles.includes(role ?? ""));

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("dashQuickActions")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {visibleActions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              className={`flex flex-col items-center gap-2 h-auto py-4 rounded-xl transition-all ${action.color}`}
              onClick={action.onClick}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

QuickActions.displayName = "QuickActions";
export default QuickActions;
