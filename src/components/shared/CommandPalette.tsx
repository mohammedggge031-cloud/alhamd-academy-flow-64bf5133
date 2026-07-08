import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  Receipt,
  BarChart3,
  BookOpen,
  ScrollText,
  Settings,
  DollarSign,
  CalendarPlus,
  Award,
  FileSpreadsheet,
  UserPlus,
  Wallet,
} from "lucide-react";

interface NavCommand {
  to: string;
  icon: any;
  labelKey: TranslationKey;
  roles: string[];
}

const navCommands: NavCommand[] = [
  { to: "/", icon: LayoutDashboard, labelKey: "navDashboard", roles: ["admin", "manager"] },
  { to: "/teacher-home", icon: LayoutDashboard, labelKey: "navDashboard", roles: ["teacher"] },
  { to: "/bookings", icon: CalendarPlus, labelKey: "navBookings", roles: ["admin", "manager"] },
  { to: "/students", icon: Users, labelKey: "navStudents", roles: ["admin", "manager"] },
  { to: "/teachers", icon: GraduationCap, labelKey: "navTeachers", roles: ["admin", "manager"] },
  { to: "/sessions", icon: CalendarDays, labelKey: "navSessions", roles: ["admin", "manager", "teacher"] },
  { to: "/my-students", icon: Users, labelKey: "navMyStudents", roles: ["teacher"] },
  { to: "/invoices", icon: Receipt, labelKey: "navInvoices", roles: ["admin"] },
  { to: "/expenses", icon: DollarSign, labelKey: "navExpenses", roles: ["admin"] },
  { to: "/reports", icon: BarChart3, labelKey: "navReports", roles: ["admin"] },
  { to: "/data-sheets", icon: FileSpreadsheet, labelKey: "navDataSheets", roles: ["admin", "manager"] },
  { to: "/monthly-reports", icon: BookOpen, labelKey: "navStudentReports", roles: ["admin", "manager", "teacher"] },
  { to: "/certificates", icon: Award, labelKey: "navCertificates", roles: ["admin", "manager"] },
  { to: "/regulations", icon: ScrollText, labelKey: "navRegulations", roles: ["admin", "manager", "teacher"] },
  { to: "/settings", icon: Settings, labelKey: "navSettings", roles: ["admin"] },
];

const quickAddCommands = [
  { to: "/students?action=add", icon: UserPlus, labelKey: "addStudent" as TranslationKey, roles: ["admin", "manager"] },
  { to: "/sessions?action=add", icon: CalendarPlus, labelKey: "dashAddSession" as TranslationKey, roles: ["admin", "manager", "teacher"] },
  { to: "/invoices?action=add", icon: Receipt, labelKey: "dashAddInvoice" as TranslationKey, roles: ["admin"] },
  { to: "/expenses?action=add", icon: Wallet, labelKey: "addExpense" as TranslationKey, roles: ["admin"] },
  { to: "/teachers?action=add", icon: GraduationCap, labelKey: "addTeacher" as TranslationKey, roles: ["admin"] },
];

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canSearchEntities = role === "admin" || role === "manager";

  const { data: students = [] } = useQuery({
    queryKey: ["cmdk-students", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await supabase
        .from("students")
        .select("id, name")
        .ilike("name", `%${search}%`)
        .eq("is_active", true)
        .limit(6);
      return data ?? [];
    },
    enabled: open && canSearchEntities && search.trim().length > 0,
    staleTime: 30_000,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["cmdk-teachers", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await supabase
        .from("teachers")
        .select("id, profiles!teachers_profile_user_id_fkey!inner(full_name)")
        .eq("is_active", true)
        .ilike("profiles.full_name", `%${search}%`)
        .limit(6);
      return (data ?? []).map((r: any) => ({ id: r.id as string, name: (r.profiles?.full_name as string) ?? "" }));
    },
    enabled: open && canSearchEntities && search.trim().length > 0,
    staleTime: 30_000,
  });

  const go = (to: string) => {
    setOpen(false);
    setSearch("");
    navigate(to);
  };

  if (!role) return null;

  const availableNav = navCommands.filter((c) => c.roles.includes(role));
  const availableQuickAdd = quickAddCommands.filter((c) => c.roles.includes(role));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("search") + "…  (Ctrl+K)"} value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>{t("noResults")}</CommandEmpty>

        {students.length > 0 && (
          <CommandGroup heading={t("navStudents")}>
            {students.map((s) => (
              <CommandItem key={`s-${s.id}`} onSelect={() => go(`/students?highlight=${s.id}`)}>
                <Users className="me-2 h-4 w-4" />
                {s.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {teachers.length > 0 && (
          <CommandGroup heading={t("navTeachers")}>
            {teachers.map((tt) => (
              <CommandItem key={`t-${tt.id}`} onSelect={() => go(`/teachers?highlight=${tt.id}`)}>
                <GraduationCap className="me-2 h-4 w-4" />
                {tt.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(students.length > 0 || teachers.length > 0) && <CommandSeparator />}

        <CommandGroup heading={t("quickAdd")}>
          {availableQuickAdd.map((c) => (
            <CommandItem key={c.to} onSelect={() => go(c.to)}>
              <c.icon className="me-2 h-4 w-4" />
              {t(c.labelKey)}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("navigation") || "التنقل"}>
          {availableNav.map((c) => (
            <CommandItem key={c.to} onSelect={() => go(c.to)}>
              <c.icon className="me-2 h-4 w-4" />
              {t(c.labelKey)}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
