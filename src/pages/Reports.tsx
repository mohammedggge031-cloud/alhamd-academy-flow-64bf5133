import { BarChart3, Download, TrendingUp, Users, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reportCards = [
  { title: "إجمالي الدخل", value: "$4,850", icon: DollarSign, change: "+8%", color: "text-success" },
  { title: "رواتب المعلمين", value: "$2,340", icon: Users, change: "", color: "text-primary" },
  { title: "صافي الربح", value: "$2,510", icon: TrendingUp, change: "+12%", color: "text-success" },
  { title: "ساعات التدريس", value: "186", icon: Clock, change: "", color: "text-primary" },
];

const reports = [
  { name: "تقرير حضور الطلاب", description: "تفصيل الحضور والغياب لكل طالب", type: "attendance" },
  { name: "تقرير أداء المعلمين", description: "ساعات التدريس والتقييمات", type: "performance" },
  { name: "تقرير الفواتير الشهري", description: "ملخص الفواتير والمدفوعات", type: "invoices" },
  { name: "تقرير ساعات الانتظار", description: "تفصيل أوقات انتظار المعلمين", type: "waiting" },
  { name: "تقرير الرصيد المنخفض", description: "طلاب على وشك نفاد رصيدهم", type: "low_balance" },
  { name: "تقرير الأرباح والخسائر", description: "تحليل مالي شامل للأكاديمية", type: "pnl" },
];

const Reports = () => {
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
                {card.change && (
                  <p className="text-xs text-success">{card.change} عن الشهر الماضي</p>
                )}
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
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
