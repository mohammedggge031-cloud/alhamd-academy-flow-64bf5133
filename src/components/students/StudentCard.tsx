import { Phone, MapPin, Clock, ArrowRightLeft, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

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
  onEdit: () => void;
  onDelete: () => void;
}

const StudentCard = ({ student, teacherName, invoiceStatus, onTransfer, onEdit, onDelete }: StudentCardProps) => {
  const { t } = useLanguage();
  const remaining = student.remaining_hours ?? 0;
  const attended = student.attended_hours ?? 0;
  const absence = student.absence_hours ?? 0;
  const scheduleArr = Array.isArray(student.schedule) ? student.schedule : [];
  const status = invoiceStatus && ["paid", "pending", "overdue"].includes(invoiceStatus) ? invoiceStatus : "pending";

  const invoiceStatusMap: Record<string, { label: string; className: string }> = {
    paid: { label: t("paid"), className: "bg-success text-success-foreground" },
    pending: { label: t("pending"), className: "bg-warning text-warning-foreground" },
    overdue: { label: t("overdue"), className: "bg-destructive text-destructive-foreground" },
  };

  const daysMap: Record<string, string> = {
    saturday: t("saturday"), sunday: t("sunday"), monday: t("monday"),
    tuesday: t("tuesday"), wednesday: t("wednesday"), thursday: t("thursday"), friday: t("friday"),
  };

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
              <a
                href={`https://wa.me/${student.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
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
            <p className="text-[10px] text-muted-foreground">{t("remaining")}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success">{attended}</p>
            <p className="text-[10px] text-muted-foreground">{t("attended")}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-destructive">{absence}</p>
            <p className="text-[10px] text-muted-foreground">{t("absence")}</p>
          </div>
        </div>

        {remaining <= 1 && (
          <div className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning font-medium">
            {t("lowBalanceWarning")}
          </div>
        )}

        {scheduleArr.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {scheduleArr.map((s: any) => `${daysMap[s.day] || s.day} ${s.time}`).join(" · ")}
          </p>
        )}

        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs" onClick={onTransfer}>
            <ArrowRightLeft className="h-3 w-3" />
            {t("transferTeacher")}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
            {t("edit")}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
            {t("delete")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCard;
