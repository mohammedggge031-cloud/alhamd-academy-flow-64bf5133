import { useState } from "react";
import { CalendarDays, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Session {
  id: string;
  student: string;
  teacher: string;
  date: string;
  timeStudent: string;
  timeEgypt: string;
  duration: number;
  status: "completed" | "absent" | "cancelled" | "postponed" | "upcoming";
  waitingMinutes?: number;
  homework?: string;
}

const mockSessions: Session[] = [
  { id: "1", student: "أحمد محمد", teacher: "أ. عبدالله", date: "2026-02-19", timeStudent: "10:00 ص (الرياض)", timeEgypt: "09:00 ص", duration: 60, status: "upcoming" },
  { id: "2", student: "فاطمة علي", teacher: "أ. سارة", date: "2026-02-19", timeStudent: "11:30 ص (دبي)", timeEgypt: "09:30 ص", duration: 60, status: "completed", homework: "مراجعة سورة البقرة الآيات 1-20" },
  { id: "3", student: "يوسف إبراهيم", teacher: "أ. عبدالله", date: "2026-02-19", timeStudent: "02:00 م (الكويت)", timeEgypt: "01:00 م", duration: 60, status: "absent", waitingMinutes: 15 },
  { id: "4", student: "مريم حسن", teacher: "أ. خالد", date: "2026-02-19", timeStudent: "03:30 م (القاهرة)", timeEgypt: "03:30 م", duration: 45, status: "upcoming" },
  { id: "5", student: "عمر خالد", teacher: "أ. سارة", date: "2026-02-19", timeStudent: "05:00 م (لندن)", timeEgypt: "07:00 م", duration: 60, status: "cancelled" },
  { id: "6", student: "نور الدين", teacher: "أ. عبدالله", date: "2026-02-18", timeStudent: "10:00 ص (الرياض)", timeEgypt: "09:00 ص", duration: 60, status: "completed", homework: "حفظ سورة آل عمران الآيات 50-60" },
  { id: "7", student: "ليلى سعيد", teacher: "أ. خالد", date: "2026-02-18", timeStudent: "04:00 م (القاهرة)", timeEgypt: "04:00 م", duration: 60, status: "postponed" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  upcoming: { label: "قادمة", className: "bg-accent text-accent-foreground" },
  completed: { label: "مكتملة", className: "bg-success text-success-foreground" },
  absent: { label: "غياب", className: "bg-destructive text-destructive-foreground" },
  cancelled: { label: "ملغاة", className: "bg-muted text-muted-foreground" },
  postponed: { label: "مؤجلة", className: "bg-warning text-warning-foreground" },
};

const Sessions = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const filtered = statusFilter === "all"
    ? mockSessions
    : mockSessions.filter((s) => s.status === statusFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          إدارة الحصص
        </h1>
        <p className="text-muted-foreground">عرض وتسجيل حالة الحصص</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="upcoming">قادمة</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="absent">غياب</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
            <SelectItem value="postponed">مؤجلة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions list */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{session.student[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{session.student}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.teacher} · {session.timeStudent}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      بتوقيت مصر: {session.timeEgypt} · {session.duration} دقيقة
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground hidden sm:block">{session.date}</span>
                  <Badge variant="secondary" className={statusConfig[session.status].className}>
                    {statusConfig[session.status].label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session detail / action dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل الحصة</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">الطالب</p>
                  <p className="font-medium">{selectedSession.student}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">المعلم</p>
                  <p className="font-medium">{selectedSession.teacher}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">وقت الطالب</p>
                  <p className="font-medium">{selectedSession.timeStudent}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">وقت مصر</p>
                  <p className="font-medium">{selectedSession.timeEgypt}</p>
                </div>
              </div>

              {selectedSession.status === "upcoming" && (
                <div className="space-y-3">
                  <Label>تسجيل حالة الحصة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="bg-success hover:bg-success/90 text-success-foreground">تمت</Button>
                    <Button variant="destructive">غياب طالب</Button>
                    <Button variant="secondary">إلغاء</Button>
                    <Button variant="outline">تأجيل</Button>
                  </div>
                </div>
              )}

              {selectedSession.status === "absent" && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">وقت الانتظار</p>
                  <p className="font-medium">{selectedSession.waitingMinutes} دقيقة (الحد الأقصى المدفوع: 15 دقيقة)</p>
                </div>
              )}

              {selectedSession.homework && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">الواجب</p>
                  <p className="font-medium">{selectedSession.homework}</p>
                </div>
              )}

              {selectedSession.status === "upcoming" && (
                <div className="space-y-2">
                  <Label>الواجب</Label>
                  <Textarea placeholder="أدخل الواجب بعد انتهاء الحصة..." />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sessions;
