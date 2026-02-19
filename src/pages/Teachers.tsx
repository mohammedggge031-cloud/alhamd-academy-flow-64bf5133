import { useState } from "react";
import { GraduationCap, Plus, Search, Phone, Star } from "lucide-react";
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

interface Teacher {
  id: string;
  name: string;
  age: number;
  whatsapp: string;
  qualification: string;
  subjects: string[];
  hourlyRate: number;
  rating: number;
  studentsCount: number;
  monthlyHours: number;
  monthlyWaitingMinutes: number;
  monthlyAbsenceHours: number;
  monthlySalary: number;
}

const mockTeachers: Teacher[] = [
  {
    id: "1", name: "أ. عبدالله أحمد", age: 35, whatsapp: "+201001234567",
    qualification: "إجازة في القراءات العشر", subjects: ["تحفيظ", "تجويد", "قراءات"],
    hourlyRate: 10, rating: 4.8, studentsCount: 8, monthlyHours: 48,
    monthlyWaitingMinutes: 45, monthlyAbsenceHours: 3, monthlySalary: 487.5,
  },
  {
    id: "2", name: "أ. سارة محمد", age: 28, whatsapp: "+201101234567",
    qualification: "إجازة في حفص عن عاصم", subjects: ["تحفيظ", "تجويد"],
    hourlyRate: 8, rating: 4.9, studentsCount: 10, monthlyHours: 56,
    monthlyWaitingMinutes: 30, monthlyAbsenceHours: 2, monthlySalary: 452,
  },
  {
    id: "3", name: "أ. خالد إبراهيم", age: 42, whatsapp: "+201201234567",
    qualification: "دكتوراه في علوم القرآن", subjects: ["تحفيظ", "تجويد", "تفسير"],
    hourlyRate: 12, rating: 4.7, studentsCount: 6, monthlyHours: 36,
    monthlyWaitingMinutes: 60, monthlyAbsenceHours: 4, monthlySalary: 444,
  },
];

const Teachers = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = mockTeachers.filter((t) => t.name.includes(search));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            إدارة المعلمين
          </h1>
          <p className="text-muted-foreground">{mockTeachers.length} معلمين</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />إضافة معلم</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إضافة معلم جديد</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>الاسم الكامل</Label>
                <Input placeholder="أدخل اسم المعلم" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>السن</Label>
                  <Input type="number" placeholder="العمر" />
                </div>
                <div className="grid gap-2">
                  <Label>ريت الساعة ($)</Label>
                  <Input type="number" placeholder="0" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>رقم الواتساب</Label>
                <Input placeholder="+201..." dir="ltr" />
              </div>
              <div className="grid gap-2">
                <Label>المؤهل الدراسي</Label>
                <Input placeholder="مثال: إجازة في حفص عن عاصم" />
              </div>
              <Button onClick={() => setDialogOpen(false)}>حفظ المعلم</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((teacher) => (
          <Card key={teacher.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{teacher.name[2]}</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">{teacher.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{teacher.qualification}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-warning">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">{teacher.rating}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {teacher.subjects.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs bg-accent text-accent-foreground">
                    {s}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span dir="ltr">{teacher.whatsapp}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                <div>
                  <p className="text-lg font-bold text-primary">{teacher.studentsCount}</p>
                  <p className="text-[10px] text-muted-foreground">طلاب</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-success">{teacher.monthlyHours}</p>
                  <p className="text-[10px] text-muted-foreground">ساعة/شهر</p>
                </div>
              </div>

              {/* Monthly stats - Admin only */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">إحصائيات الشهر</p>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <span className="text-muted-foreground">ساعات الغياب:</span>
                  <span className="font-medium">{teacher.monthlyAbsenceHours} ساعات</span>
                  <span className="text-muted-foreground">وقت الانتظار:</span>
                  <span className="font-medium">{teacher.monthlyWaitingMinutes} دقيقة</span>
                  <span className="text-muted-foreground">المرتب:</span>
                  <span className="font-bold text-primary">${teacher.monthlySalary}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Teachers;
