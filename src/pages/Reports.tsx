import { BarChart3, Download, TrendingUp, Users, Clock, DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Reports = () => {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: totalIncome = 0 } = useQuery({
    queryKey: ["report-income"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("total").eq("status", "paid").gte("paid_at", monthStart);
      return data ? data.reduce((sum, i) => sum + Number(i.total), 0) : 0;
    },
  });

  const { data: totalSalaries = 0 } = useQuery({
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

  const netProfit = totalIncome - totalSalaries;

  const reportCards = [
    { title: "إجمالي الدخل", value: `$${totalIncome.toLocaleString()}`, icon: DollarSign, change: "", color: "text-success" },
    { title: "رواتب المعلمين", value: `$${totalSalaries.toLocaleString()}`, icon: Users, change: "", color: "text-primary" },
    { title: "صافي الربح", value: `$${netProfit.toLocaleString()}`, icon: TrendingUp, change: "", color: netProfit >= 0 ? "text-success" : "text-destructive" },
    { title: "ساعات التدريس", value: String(totalHours), icon: Clock, change: "", color: "text-primary" },
  ];

  const generateCSV = async (type: string) => {
    let csvContent = "";
    let filename = "";

    if (type === "attendance") {
      const { data } = await supabase
        .from("sessions")
        .select("session_date, status, duration_minutes, students:student_id(name), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .gte("session_date", monthStart)
        .lte("session_date", monthEnd)
        .order("session_date");
      csvContent = "التاريخ,الطالب,المعلم,الحالة,المدة (دقيقة)\n";
      (data ?? []).forEach((s: any) => {
        csvContent += `${s.session_date},${s.students?.name},${s.teachers?.profiles?.full_name},${s.status},${s.duration_minutes}\n`;
      });
      filename = "attendance_report.csv";
    } else if (type === "performance") {
      const { data } = await supabase
        .from("teachers")
        .select("monthly_hours, monthly_absence_hours, monthly_waiting_minutes, monthly_salary, hourly_rate, profiles:user_id(full_name)")
        .eq("is_active", true);
      csvContent = "المعلم,ساعات التدريس,ساعات الغياب,دقائق الانتظار,ريت الساعة,الراتب\n";
      (data ?? []).forEach((t: any) => {
        csvContent += `${t.profiles?.full_name},${t.monthly_hours},${t.monthly_absence_hours},${t.monthly_waiting_minutes},${t.hourly_rate},${t.monthly_salary}\n`;
      });
      filename = "teacher_performance.csv";
    } else if (type === "low_balance") {
      const { data } = await supabase
        .from("students")
        .select("name, remaining_hours, paid_hours, attended_hours")
        .eq("is_active", true)
        .lte("remaining_hours", 2)
        .order("remaining_hours");
      csvContent = "الطالب,الساعات المتبقية,الساعات المدفوعة,الساعات المحضورة\n";
      (data ?? []).forEach((s: any) => {
        csvContent += `${s.name},${s.remaining_hours},${s.paid_hours},${s.attended_hours}\n`;
      });
      filename = "low_balance_students.csv";
    } else if (type === "invoices") {
      const { data } = await supabase
        .from("invoices")
        .select("*, students:student_id(name)")
        .gte("created_at", monthStart)
        .order("created_at");
      csvContent = "الطالب,المبلغ,الخصم,الإجمالي,الحالة,تاريخ الاستحقاق\n";
      (data ?? []).forEach((inv: any) => {
        csvContent += `${inv.students?.name},${inv.amount},${inv.discount},${inv.total},${inv.status},${inv.due_date}\n`;
      });
      filename = "invoices_report.csv";
    } else if (type === "pnl") {
      csvContent = "البند,المبلغ\n";
      csvContent += `إجمالي الدخل,$${totalIncome}\n`;
      csvContent += `رواتب المعلمين,$${totalSalaries}\n`;
      csvContent += `صافي الربح,$${netProfit}\n`;
      filename = "profit_loss.csv";
    }

    if (csvContent) {
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const reports = [
    { name: "تقرير حضور الطلاب", description: "تفصيل الحضور والغياب لكل طالب", type: "attendance" },
    { name: "تقرير أداء المعلمين", description: "ساعات التدريس والتقييمات", type: "performance" },
    { name: "تقرير الفواتير الشهري", description: "ملخص الفواتير والمدفوعات", type: "invoices" },
    { name: "تقرير الطلاب المهددين بانتهاء الرصيد", description: "طلاب على وشك نفاد رصيدهم", type: "low_balance" },
    { name: "تقرير الأرباح والخسائر", description: "تحليل مالي شامل للأكاديمية", type: "pnl" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          التقارير والتحليلات
        </h1>
        <p className="text-muted-foreground">تقارير شهرية قابلة للتصدير</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Available reports */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">التقارير المتاحة</CardTitle>
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
