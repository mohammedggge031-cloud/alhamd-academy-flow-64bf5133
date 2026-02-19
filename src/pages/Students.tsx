import { useState } from "react";
import { Users, Plus, Search, Phone, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Student {
  id: string;
  name: string;
  age: number;
  country: string;
  whatsapp: string;
  timezone: string;
  teacher: string;
  paidHours: number;
  remainingHours: number;
  attendedHours: number;
  absenceHours: number;
  invoiceStatus: "paid" | "pending" | "overdue";
  schedule: string;
}

const mockStudents: Student[] = [
  {
    id: "1", name: "أحمد محمد", age: 12, country: "السعودية", whatsapp: "+966501234567",
    timezone: "Asia/Riyadh", teacher: "أ. عبدالله", paidHours: 20, remainingHours: 8,
    attendedHours: 10, absenceHours: 2, invoiceStatus: "paid",
    schedule: "الأحد، الثلاثاء، الخميس - 10:00 ص",
  },
  {
    id: "2", name: "فاطمة علي", age: 10, country: "الإمارات", whatsapp: "+971501234567",
    timezone: "Asia/Dubai", teacher: "أ. سارة", paidHours: 16, remainingHours: 4,
    attendedHours: 11, absenceHours: 1, invoiceStatus: "pending",
    schedule: "السبت، الاثنين، الأربعاء - 11:30 ص",
  },
  {
    id: "3", name: "يوسف إبراهيم", age: 14, country: "الكويت", whatsapp: "+965501234567",
    timezone: "Asia/Kuwait", teacher: "أ. عبدالله", paidHours: 12, remainingHours: 0.5,
    attendedHours: 10.5, absenceHours: 1, invoiceStatus: "overdue",
    schedule: "الأحد، الثلاثاء - 02:00 م",
  },
  {
    id: "4", name: "مريم حسن", age: 9, country: "مصر", whatsapp: "+201001234567",
    timezone: "Africa/Cairo", teacher: "أ. خالد", paidHours: 24, remainingHours: 18,
    attendedHours: 6, absenceHours: 0, invoiceStatus: "paid",
    schedule: "السبت، الاثنين، الأربعاء - 03:30 م",
  },
];

const invoiceStatusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "مدفوعة", className: "bg-success text-success-foreground" },
  pending: { label: "معلقة", className: "bg-warning text-warning-foreground" },
  overdue: { label: "متأخرة", className: "bg-destructive text-destructive-foreground" },
};

const Students = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = mockStudents.filter((s) =>
    s.name.includes(search) || s.whatsapp.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            إدارة الطلاب
          </h1>
          <p className="text-muted-foreground">{mockStudents.length} طالب مسجل</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة طالب
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة طالب جديد</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>الاسم الكامل</Label>
                <Input placeholder="أدخل اسم الطالب" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>السن</Label>
                  <Input type="number" placeholder="العمر" />
                </div>
                <div className="grid gap-2">
                  <Label>الدولة</Label>
                  <Input placeholder="الدولة" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>رقم الواتساب</Label>
                <Input placeholder="+966..." dir="ltr" />
              </div>
              <div className="grid gap-2">
                <Label>المنطقة الزمنية</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="اختر المنطقة الزمنية" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Cairo">القاهرة (UTC+2)</SelectItem>
                    <SelectItem value="Asia/Riyadh">الرياض (UTC+3)</SelectItem>
                    <SelectItem value="Asia/Dubai">دبي (UTC+4)</SelectItem>
                    <SelectItem value="Asia/Kuwait">الكويت (UTC+3)</SelectItem>
                    <SelectItem value="Europe/London">لندن (UTC+0)</SelectItem>
                    <SelectItem value="America/New_York">نيويورك (UTC-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>المعلم</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">أ. عبدالله</SelectItem>
                    <SelectItem value="2">أ. سارة</SelectItem>
                    <SelectItem value="3">أ. خالد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>عدد الساعات المدفوعة</Label>
                  <Input type="number" placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>سعر الباقة ($)</Label>
                  <Input type="number" placeholder="0" />
                </div>
              </div>
              <Button onClick={() => setDialogOpen(false)}>حفظ الطالب</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Students grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((student) => (
          <Card key={student.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{student.name[0]}</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">{student.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{student.teacher}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={invoiceStatusMap[student.invoiceStatus].className}>
                  {invoiceStatusMap[student.invoiceStatus].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {student.country}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> <span dir="ltr">{student.whatsapp}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {student.timezone.split("/")[1]}
                </span>
              </div>

              {/* Hours breakdown */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                <div>
                  <p className="text-lg font-bold text-primary">{student.remainingHours}</p>
                  <p className="text-[10px] text-muted-foreground">متبقي</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-success">{student.attendedHours}</p>
                  <p className="text-[10px] text-muted-foreground">محضور</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-destructive">{student.absenceHours}</p>
                  <p className="text-[10px] text-muted-foreground">غياب</p>
                </div>
              </div>

              {/* Low balance warning */}
              {student.remainingHours <= 1 && (
                <div className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning font-medium">
                  ⚠️ رصيد الساعات على وشك النفاد
                </div>
              )}

              <p className="text-xs text-muted-foreground">{student.schedule}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Students;
