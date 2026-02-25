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
  CalendarPlus,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/logo.jpeg";

interface SidebarProps {
  onClose?: () => void;
}

const allNavItems: { to: string; icon: any; labelKey: TranslationKey; roles: string[]; badgeKey?: string }[] = [
  { to: "/", icon: LayoutDashboard, labelKey: "navDashboard", roles: ["admin", "manager"] },
  { to: "/bookings", icon: CalendarPlus, labelKey: "navBookings", roles: ["admin", "manager"], badgeKey: "bookings" },
  { to: "/students", icon: Users, labelKey: "navStudents", roles: ["admin", "manager"] },
  { to: "/teachers", icon: GraduationCap, labelKey: "navTeachers", roles: ["admin", "manager"] },
  { to: "/sessions", icon: CalendarDays, labelKey: "navSessions", roles: ["admin", "manager", "teacher"] },
  { to: "/my-profile", icon: Users, labelKey: "navMyProfile", roles: ["teacher"] },
  { to: "/invoices", icon: Receipt, labelKey: "navInvoices", roles: ["admin", "manager"] },
  { to: "/expenses", icon: DollarSign, labelKey: "navExpenses", roles: ["admin"] },
  { to: "/reports", icon: BarChart3, labelKey: "navReports", roles: ["admin"] },
  { to: "/monthly-reports", icon: BookOpen, labelKey: "navStudentReports", roles: ["admin", "manager", "teacher"] },
  { to: "/settings", icon: Settings, labelKey: "navSettings", roles: ["admin"] },
];

export const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();
  const { signOut, role } = useAuth();
  const { t } = useLanguage();

  const { data: unreadCounts = { bookings: 0 } } = useQuery({
    queryKey: ["sidebar-unread"],
    queryFn: async () => {
      const [bookingsRes, subsRes] = await Promise.all([
        supabase.from("trial_bookings").select("id", { count: "exact", head: true }).eq("is_read", false),
        supabase.from("subscription_requests").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      return {
        bookings: (bookingsRes.count ?? 0) + (subsRes.count ?? 0),
      };
    },
    refetchInterval: 30000, // refresh every 30s
  });

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

          const badgeCount = item.badgeKey ? (unreadCounts as any)[item.badgeKey] ?? 0 : 0;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </div>
              {badgeCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] animate-pulse">
                  {badgeCount}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-bold text-sidebar-primary">{role === "manager" ? "M" : role === "teacher" ? "T" : "A"}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-sidebar-foreground">{role === "manager" ? t("manager") : role === "teacher" ? t("teacher") : t("admin")}</p>
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
