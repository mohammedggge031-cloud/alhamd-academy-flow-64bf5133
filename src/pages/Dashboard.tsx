import {
  Users,
  GraduationCap,
  Receipt,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "الطلاب النشطون", value: "47", icon: Users, trend: "+3 هذا الشهر" },
  { label: "المعلمون", value: "12", icon: GraduationCap, trend: "نشطون" },
  { label: "الفواتير المستحقة اليوم", value: "5", icon: Receipt, trend: "بقيمة $750" },
  { label: "ساعات التدريس هذا الشهر", value: "186", icon: Clock, trend: "+12% عن الشهر الماضي" },
];

const todaySessions = [
  { student: "أحمد محمد", teacher: "أ. عبدالله", time: "10:00 ص", status: "upcoming" },
  { student: "فاطمة علي", teacher: "أ. سارة", time: "11:30 ص", status: "completed" },
  { student: "يوسف إبراهيم", teacher: "أ. عبدالله", time: "02:00 م", status: "upcoming" },
  { student: "مريم حسن", teacher: "أ. خالد", time: "03:30 م", status: "upcoming" },
  { student: "عمر خالد", teacher: "أ. سارة", time: "05:00 م", status: "cancelled" },
];

const overdueInvoices = [
  { student: "أحمد محمد", amount: "$120", dueDate: "15 فبراير", days: 4 },
  { student: "نور الدين", amount: "$80", dueDate: "12 فبراير", days: 7 },
  { student: "ليلى سعيد", amount: "$150", dueDate: "10 فبراير", days: 9 },
];

const lowBalanceStudents = [
  { name: "يوسف إبراهيم", remaining: "0.5 ساعة" },
  { name: "عمر خالد", remaining: "1 ساعة" },
];

const statusMap: Record<string, { label: string; className: string }> = {
  upcoming: { label: "قادمة", className: "bg-accent text-accent-foreground" },
  completed: { label: "مكتملة", className: "bg-success text-success-foreground" },
  cancelled: { label: "ملغاة", className: "bg-destructive text-destructive-foreground" },
};

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">مرحباً بك في أكاديمية الحمد لتحفيظ القرآن الكريم</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-0.5 text-xs text-primary flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's sessions */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              حصص اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySessions.map((session, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {session.student[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.student}</p>
                      <p className="text-xs text-muted-foreground">{session.teacher}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{session.time}</span>
                    <Badge variant="secondary" className={statusMap[session.status].className}>
                      {statusMap[session.status].label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts column */}
        <div className="space-y-6">
          {/* Overdue invoices */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
                فواتير متأخرة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueInvoices.map((inv, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{inv.student}</p>
                    <p className="text-xs text-muted-foreground">متأخر {inv.days} أيام</p>
                  </div>
                  <span className="text-sm font-bold text-destructive">{inv.amount}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Low balance */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-warning" />
                رصيد منخفض
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowBalanceStudents.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">{s.name}</p>
                  <Badge variant="secondary" className="bg-warning/10 text-warning">
                    {s.remaining}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
