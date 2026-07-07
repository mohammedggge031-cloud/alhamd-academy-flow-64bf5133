import { useState } from "react";
import { Plus, UserPlus, CalendarPlus, Receipt, Wallet, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FloatingQuickAdd = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t, isRtl } = useLanguage();

  if (!role) return null;

  const actions = [
    { label: t("addStudent"), icon: UserPlus, to: "/students?action=add", roles: ["admin", "manager"] },
    { label: t("dashAddSession"), icon: CalendarPlus, to: "/sessions?action=add", roles: ["admin", "manager", "teacher"] },
    { label: t("dashAddInvoice"), icon: Receipt, to: "/invoices?action=add", roles: ["admin"] },
    { label: t("addExpense") || "Expense", icon: Wallet, to: "/expenses?action=add", roles: ["admin"] },
    { label: t("addTeacher") || "Teacher", icon: GraduationCap, to: "/teachers?action=add", roles: ["admin"] },
  ].filter((a) => a.roles.includes(role));

  if (actions.length === 0) return null;

  const side = isRtl ? "left-6" : "right-6";

  return (
    <div className={cn("fixed bottom-6 z-40 flex flex-col items-end gap-2", side)}>
      {open &&
        actions.map((a) => (
          <Button
            key={a.label}
            onClick={() => {
              navigate(a.to);
              setOpen(false);
            }}
            className="shadow-lg gap-2 bg-card text-foreground hover:bg-accent border animate-in fade-in slide-in-from-bottom-2"
            size="sm"
          >
            <a.icon className="h-4 w-4" />
            {a.label}
          </Button>
        ))}
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-transform",
          open && "rotate-45"
        )}
        aria-label={t("quickAdd")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default FloatingQuickAdd;
