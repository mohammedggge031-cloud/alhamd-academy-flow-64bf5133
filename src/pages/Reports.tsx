import { BarChart3, Download, TrendingUp, Users, Clock, DollarSign, Loader2, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";

const Reports = () => {
  const { t } = useLanguage();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: totalIncome = 0 } = useQuery({
    queryKey: ["report-income"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("total").eq("status", "paid").gte("paid_at", monthStart);
      return data ? data.reduce((sum, i) => sum + Number(i.total), 0) : 0;
    },
  });

  const { data: totalTeacherSalaries = 0 } = useQuery({
    queryKey: ["report-salaries"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("monthly_salary").eq("is_active", true);
      return data ? data.reduce((sum, t) => sum + Number(t.monthly_salary ?? 0), 0) : 0;
    },
  });

  const { data: totalHours = 0 } = useQuery({
    queryKey: ["report-hours"],
    queryFn: async () => {
      const { data } = await supabase.from("sessions").select("duration_minutes").eq("status", "completed").gte("session_date", monthStart);
      return data ? Math.round(data.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60) : 0;
    },
  });

  const { data: totalExpenses = 0 } = useQuery({
    queryKey: ["report-expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("amount").gte("expense_month", monthStart).lte("expense_month", monthEnd);
      return data ? data.reduce((sum, e) => sum + Number(e.amount), 0) : 0;
    },
  });

  const totalCosts = totalTeacherSalaries + totalExpenses;
  const netProfit = totalIncome - totalCosts;

  const reportCards = [
    { title: t("totalIncome"), value: `$${totalIncome.toLocaleString()}`, icon: DollarSign, color: "text-success" },
    { title: t("teacherSalaries"), value: `$${totalTeacherSalaries.toLocaleString()}`, icon: Users, color: "text-primary" },
    { title: t("expensesAndAds"), value: `$${totalExpenses.toLocaleString()}`, icon: Megaphone, color: "text-primary" },
    { title: t("netProfit"), value: `$${netProfit.toLocaleString()}`, icon: TrendingUp, color: netProfit >= 0 ? "text-success" : "text-destructive" },
    { title: t("teachingHours"), value: String(totalHours), icon: Clock, color: "text-primary" },
  ];

  const generateCSV = async (type: string) => {
    let csvContent = "";
    let filename = "";

    if (type === "attendance") {
      const { data } = await supabase
        .from("sessions")
        .select("session_date, status, duration_minutes, students:student_id(name), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .gte("session_date", monthStart).lte("session_date", monthEnd).order("session_date");
      csvContent = "Date,Student,Teacher,Status,Duration (min)\n";
      (data ?? []).forEach((s: any) => {
        csvContent += `${s.session_date},${s.students?.name},${s.teachers?.profiles?.full_name},${s.status},${s.duration_minutes}\n`;
      });
      filename = "attendance_report.csv";
    } else if (type === "performance") {
      const { data } = await supabase
        .from("teachers")
        .select("monthly_hours, monthly_absence_hours, monthly_waiting_minutes, monthly_salary, hourly_rate, profiles:user_id(full_name)")
        .eq("is_active", true);
      csvContent = "Teacher,Hours,Absence Hours,Waiting Min,Rate,Salary\n";
      (data ?? []).forEach((t: any) => {
        csvContent += `${t.profiles?.full_name},${t.monthly_hours},${t.monthly_absence_hours},${t.monthly_waiting_minutes},${t.hourly_rate},${t.monthly_salary}\n`;
      });
      filename = "teacher_performance.csv";
    } else if (type === "low_balance") {
      const { data } = await supabase
        .from("students").select("name, remaining_hours, paid_hours, attended_hours")
        .eq("is_active", true).lte("remaining_hours", 2).order("remaining_hours");
      csvContent = "Student,Remaining,Paid,Attended\n";
      (data ?? []).forEach((s: any) => {
        csvContent += `${s.name},${s.remaining_hours},${s.paid_hours},${s.attended_hours}\n`;
      });
      filename = "low_balance_students.csv";
    } else if (type === "invoices") {
      const { data } = await supabase
        .from("invoices").select("*, students:student_id(name)")
        .gte("created_at", monthStart).order("created_at");
      csvContent = "Student,Amount,Discount,Total,Status,Due Date\n";
      (data ?? []).forEach((inv: any) => {
        csvContent += `${inv.students?.name},${inv.amount},${inv.discount},${inv.total},${inv.status},${inv.due_date}\n`;
      });
      filename = "invoices_report.csv";
    } else if (type === "pnl") {
      csvContent = "Item,Amount\n";
      csvContent += `Total Income,$${totalIncome}\n`;
      csvContent += `Teacher Salaries,$${totalTeacherSalaries}\n`;
      csvContent += `Expenses & Ads,$${totalExpenses}\n`;
      csvContent += `Net Profit,$${netProfit}\n`;
      filename = "profit_loss.csv";
    }

    if (csvContent) {
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const reports = [
    { name: t("attendanceReport"), description: t("attendanceDesc"), type: "attendance" },
    { name: t("performanceReport"), description: t("performanceDesc"), type: "performance" },
    { name: t("invoiceReport"), description: t("invoiceReportDesc"), type: "invoices" },
    { name: t("lowBalanceReport"), description: t("lowBalanceDesc"), type: "low_balance" },
    { name: t("pnlReport"), description: t("pnlDesc"), type: "pnl" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          {t("reportsTitle")}
        </h1>
        <p className="text-muted-foreground">{t("reportsSubtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {reportCards.map((card) => (
          <Card key={card.title} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("availableReports")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {reports.map((report) => (
              <div key={report.type} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{report.name}</p>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => generateCSV(report.type)}>
                  <Download className="h-3 w-3" />
                  CSV
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
