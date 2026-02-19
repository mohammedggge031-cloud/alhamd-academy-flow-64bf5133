import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  Receipt,
  BarChart3,
  BookOpen,
  Settings,
  DollarSign,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import logo from "@/assets/logo.jpeg";

interface SidebarProps {
  onClose?: () => void;
}

const allNavItems: { to: string; icon: any; labelKey: TranslationKey; roles: string[] }[] = [
  { to: "/", icon: LayoutDashboard, labelKey: "navDashboard", roles: ["admin", "manager"] },
  { to: "/students", icon: Users, labelKey: "navStudents", roles: ["admin", "manager"] },
  { to: "/teachers", icon: GraduationCap, labelKey: "navTeachers", roles: ["admin", "manager"] },
  { to: "/sessions", icon: CalendarDays, labelKey: "navSessions", roles: ["admin", "manager"] },
  { to: "/invoices", icon: Receipt, labelKey: "navInvoices", roles: ["admin", "manager"] },
  { to: "/expenses", icon: DollarSign, labelKey: "navExpenses", roles: ["admin"] },
  { to: "/reports", icon: BarChart3, labelKey: "navReports", roles: ["admin"] },
  { to: "/monthly-reports", icon: BookOpen, labelKey: "navStudentReports", roles: ["admin", "manager"] },
  { to: "/settings", icon: Settings, labelKey: "navSettings", roles: ["admin"] },
];

export const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();
  const { signOut, role } = useAuth();
  const { t } = useLanguage();

  const navItems = allNavItems.filter(item => item.roles.includes(role ?? ""));

  return (
    <aside className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Alhamd Academy" className="h-10 w-10 rounded-lg object-contain" />
          <div>
            <h2 className="text-base font-bold text-sidebar-foreground">{t("academyName")}</h2>
            <p className="text-xs text-sidebar-muted">{t("academySubtitle")}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-muted hover:text-sidebar-foreground lg:hidden"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-bold text-sidebar-primary">{role === "manager" ? "M" : "A"}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-sidebar-foreground">{role === "manager" ? t("manager") : t("admin")}</p>
            <p className="text-xs text-sidebar-muted">{role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-muted hover:text-destructive hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </Button>
      </div>
    </aside>
  );
};
