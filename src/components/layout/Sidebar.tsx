import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  Receipt,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg";

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "لوحة التحكم" },
  { to: "/students", icon: Users, label: "الطلاب" },
  { to: "/teachers", icon: GraduationCap, label: "المعلمون" },
  { to: "/sessions", icon: CalendarDays, label: "الحصص" },
  { to: "/invoices", icon: Receipt, label: "الفواتير" },
  { to: "/reports", icon: BarChart3, label: "التقارير" },
  { to: "/settings", icon: Settings, label: "الإعدادات" },
];

export const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();

  return (
    <aside className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Alhamd Academy" className="h-10 w-10 rounded-lg object-contain" />
          <div>
            <h2 className="text-base font-bold text-sidebar-foreground">أكاديمية الحمد</h2>
            <p className="text-xs text-sidebar-muted">لتحفيظ القرآن الكريم</p>
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
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-bold text-sidebar-primary">أ</span>
          </div>
          <div>
            <p className="text-sm font-medium text-sidebar-foreground">المدير</p>
            <p className="text-xs text-sidebar-muted">admin@alhamd.academy</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
