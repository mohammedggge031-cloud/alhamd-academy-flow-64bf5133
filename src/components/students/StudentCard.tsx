import { Phone, MapPin, Clock, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DAYS_AR: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

interface StudentCardProps {
  student: {
    id: string;
    name: string;
    age: number | null;
    country: string | null;
    whatsapp: string | null;
    timezone: string | null;
    assigned_teacher_id: string | null;
    paid_hours: number | null;
    remaining_hours: number | null;
    attended_hours: number | null;
    absence_hours: number | null;
    schedule: any;
    session_duration_minutes: number | null;
  };
  teacherName: string;
  invoiceStatus: string | null;
  onTransfer: () => void;
}

const invoiceStatusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "مدفوعة", className: "bg-success text-success-foreground" },
  pending: { label: "معلقة", className: "bg-warning text-warning-foreground" },
  overdue: { label: "متأخرة", className: "bg-destructive text-destructive-foreground" },
};

const StudentCard = ({ student, teacherName, invoiceStatus, onTransfer }: StudentCardProps) => {
  const remaining = student.remaining_hours ?? 0;
  const attended = student.attended_hours ?? 0;
  const absence = student.absence_hours ?? 0;
  const scheduleArr = Array.isArray(student.schedule) ? student.schedule : [];
  const status = invoiceStatus && invoiceStatusMap[invoiceStatus] ? invoiceStatus : "pending";

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{student.name[0]}</span>
            </div>
            <div>
              <CardTitle className="text-base">{student.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{teacherName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className={invoiceStatusMap[status].className}>
              {invoiceStatusMap[status].label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {student.country && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {student.country}
            </span>
          )}
          {student.whatsapp && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> <span dir="ltr">{student.whatsapp}</span>
            </span>
          )}
          {student.timezone && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {student.timezone.split("/")[1]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
          <div>
            <p className="text-lg font-bold text-primary">{remaining}</p>
            <p className="text-[10px] text-muted-foreground">متبقي</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success">{attended}</p>
            <p className="text-[10px] text-muted-foreground">محضور</p>
          </div>
          <div>
            <p className="text-lg font-bold text-destructive">{absence}</p>
            <p className="text-[10px] text-muted-foreground">غياب</p>
          </div>
        </div>

        {remaining <= 1 && (
          <div className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning font-medium">
            ⚠️ رصيد الساعات على وشك النفاد
          </div>
        )}

        {scheduleArr.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {scheduleArr.map((s: any) => `${DAYS_AR[s.day] || s.day} ${s.time}`).join(" · ")}
          </p>
        )}

        <Button variant="ghost" size="sm" className="w-full gap-2 text-xs" onClick={onTransfer}>
          <ArrowRightLeft className="h-3 w-3" />
          تحويل لمعلم آخر
        </Button>
      </CardContent>
    </Card>
  );
};

export default StudentCard;
