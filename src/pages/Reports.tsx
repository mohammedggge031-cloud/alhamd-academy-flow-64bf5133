import { BarChart3, Download, TrendingUp, Users, Clock, DollarSign, Loader2, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";

const Reports = () => {
  const { t, lang } = useLanguage();
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

  const exportData = async (type: string, format: "csv" | "xlsx" = "csv") => {
    const isAr = lang === "ar";
    const L = (ar: string, en: string) => (isAr ? ar : en);

    let rows: Record<string, any>[] = [];
    let headers: string[] = [];
    let filename = "";

    if (type === "attendance") {
      const { data } = await supabase
        .from("sessions")
        .select("session_date, status, duration_minutes, students:student_id(name), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .gte("session_date", monthStart).lte("session_date", monthEnd).order("session_date");
      const H = {
        date: L("التاريخ", "Date"),
        student: L("الطالب", "Student"),
        teacher: L("المعلم", "Teacher"),
        status: L("الحالة", "Status"),
        duration: L("المدة (دقيقة)", "Duration (min)"),
      };
      headers = [H.date, H.student, H.teacher, H.status, H.duration];
      rows = (data ?? []).map((s: any) => ({
        [H.date]: s.session_date, [H.student]: s.students?.name, [H.teacher]: s.teachers?.profiles?.full_name,
        [H.status]: s.status, [H.duration]: s.duration_minutes,
      }));
      filename = "attendance_report";
    } else if (type === "performance") {
      const { data } = await supabase
        .from("teachers")
        .select("monthly_hours, monthly_absence_hours, monthly_waiting_minutes, monthly_salary, hourly_rate, profiles:user_id(full_name)")
        .eq("is_active", true);
      const H = {
        teacher: L("المعلم", "Teacher"),
        hours: L("الساعات", "Hours"),
        absHours: L("ساعات الغياب", "Absence Hours"),
        waitMin: L("دقائق الانتظار", "Waiting Minutes"),
        rate: L("ريت الساعة", "Hourly Rate"),
        salary: L("الراتب", "Salary"),
      };
      headers = [H.teacher, H.hours, H.absHours, H.waitMin, H.rate, H.salary];
      rows = (data ?? []).map((t: any) => ({
        [H.teacher]: t.profiles?.full_name, [H.hours]: t.monthly_hours, [H.absHours]: t.monthly_absence_hours,
        [H.waitMin]: t.monthly_waiting_minutes, [H.rate]: t.hourly_rate, [H.salary]: t.monthly_salary,
      }));
      filename = "teacher_performance";
    } else if (type === "students") {
      const { data } = await supabase
        .from("students")
        .select("name, age, country, remaining_hours, paid_hours, attended_hours, absence_hours, whatsapp, guardian_whatsapp, is_active")
        .order("name");
      const H = {
        name: L("الاسم", "Name"),
        age: L("السن", "Age"),
        country: L("الدولة", "Country"),
        remaining: L("المتبقي", "Remaining"),
        paid: L("المدفوع", "Paid"),
        attended: L("المحضور", "Attended"),
        absence: L("الغياب", "Absence"),
        wa: L("واتساب الطالب", "Student WhatsApp"),
        gwa: L("واتساب ولي الأمر", "Guardian WhatsApp"),
        active: L("نشط", "Active"),
      };
      headers = [H.name, H.age, H.country, H.remaining, H.paid, H.attended, H.absence, H.wa, H.gwa, H.active];
      rows = (data ?? []).map((s: any) => ({
        [H.name]: s.name, [H.age]: s.age, [H.country]: s.country, [H.remaining]: s.remaining_hours,
        [H.paid]: s.paid_hours, [H.attended]: s.attended_hours, [H.absence]: s.absence_hours,
        [H.wa]: s.whatsapp, [H.gwa]: s.guardian_whatsapp, [H.active]: s.is_active ? L("نعم", "Yes") : L("لا", "No"),
      }));
      filename = "students_data";
    } else if (type === "invoices") {
      const { data } = await supabase
        .from("invoices").select("*, students:student_id(name)")
        .gte("created_at", monthStart).order("created_at");
      const H = {
        student: L("الطالب", "Student"),
        amount: L("المبلغ", "Amount"),
        discount: L("الخصم", "Discount"),
        total: L("الإجمالي", "Total"),
        status: L("الحالة", "Status"),
        due: L("تاريخ الاستحقاق", "Due Date"),
      };
      headers = [H.student, H.amount, H.discount, H.total, H.status, H.due];
      rows = (data ?? []).map((inv: any) => ({
        [H.student]: inv.students?.name, [H.amount]: inv.amount, [H.discount]: inv.discount,
        [H.total]: inv.total, [H.status]: inv.status, [H.due]: inv.due_date,
      }));
      filename = "invoices_report";
    } else if (type === "low_balance") {
      const { data } = await supabase
        .from("students").select("name, remaining_hours, paid_hours, attended_hours")
        .eq("is_active", true).lte("remaining_hours", 2).order("remaining_hours");
      const H = {
        student: L("الطالب", "Student"),
        remaining: L("المتبقي", "Remaining"),
        paid: L("المدفوع", "Paid"),
        attended: L("المحضور", "Attended"),
      };
      headers = [H.student, H.remaining, H.paid, H.attended];
      rows = (data ?? []).map((s: any) => ({
        [H.student]: s.name, [H.remaining]: s.remaining_hours, [H.paid]: s.paid_hours, [H.attended]: s.attended_hours,
      }));
      filename = "low_balance_students";
    } else if (type === "pnl") {
      const H = { item: L("البند", "Item"), amount: L("المبلغ", "Amount") };
      headers = [H.item, H.amount];
      rows = [
        { [H.item]: L("إجمالي الدخل", "Total Income"), [H.amount]: totalIncome },
        { [H.item]: L("رواتب المعلمين", "Teacher Salaries"), [H.amount]: totalTeacherSalaries },
        { [H.item]: L("المصاريف والإعلانات", "Expenses & Ads"), [H.amount]: totalExpenses },
        { [H.item]: L("صافي الربح", "Net Profit"), [H.amount]: netProfit },
      ];
      filename = "profit_loss";
    }

    if (rows.length === 0) return;

    if (format === "xlsx") {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } else {
      const BOM = "\uFEFF";
      let csvContent = headers.join(",") + "\n";
      rows.forEach((row) => {
        csvContent += headers.map((h) => `"${row[h] ?? ""}"`).join(",") + "\n";
      });
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const reports = [
    { name: t("attendanceReport"), description: t("attendanceDesc"), type: "attendance" },
    { name: t("performanceReport"), description: t("performanceDesc"), type: "performance" },
    { name: lang === "ar" ? "تقرير بيانات الطلاب" : "Students Data Report", description: lang === "ar" ? "تصدير شامل لبيانات جميع الطلاب" : "Complete students data export", type: "students" },
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportData(report.type, "csv")}>
                    <Download className="h-3 w-3" />
                    CSV
                  </Button>
                  <Button size="sm" className="gap-1.5 text-xs" onClick={() => exportData(report.type, "xlsx")}>
                    <Download className="h-3 w-3" />
                    Excel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
