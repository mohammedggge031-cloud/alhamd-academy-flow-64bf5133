import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
}

interface TransferStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  currentTeacherId: string | null;
  studentSchedule: any[];
  onSuccess: () => void;
}

const DAYS_AR: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

const TransferStudentDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  currentTeacherId,
  studentSchedule,
  onSuccess,
}: TransferStudentDialogProps) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchTeachers = async () => {
      const { data } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("is_active", true);
      if (data) {
        const list: Teacher[] = [];
        for (const t of data) {
          if (t.id === currentTeacherId) continue;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", t.user_id)
            .maybeSingle();
          list.push({ id: t.id, name: profile?.full_name || "معلم" });
        }
        setTeachers(list);
      }
    };
    fetchTeachers();
  }, [open, currentTeacherId]);

  useEffect(() => {
    if (!selectedTeacher || !studentSchedule?.length) {
      setConflicts([]);
      return;
    }
    const checkConflicts = async () => {
      setChecking(true);
      // Get all students assigned to the target teacher
      const { data: otherStudents } = await supabase
        .from("students")
        .select("name, schedule")
        .eq("assigned_teacher_id", selectedTeacher)
        .eq("is_active", true);

      const found: any[] = [];
      if (otherStudents) {
        for (const other of otherStudents) {
          const otherSchedule = (other.schedule as any[]) || [];
          for (const entry of studentSchedule) {
            for (const otherEntry of otherSchedule) {
              if (entry.day === otherEntry.day && entry.time === otherEntry.time) {
                found.push({
                  day: DAYS_AR[entry.day] || entry.day,
                  time: entry.time,
                  conflictStudent: other.name,
                });
              }
            }
          }
        }
      }
      setConflicts(found);
      setChecking(false);
    };
    checkConflicts();
  }, [selectedTeacher, studentSchedule]);

  const handleTransfer = async () => {
    if (!selectedTeacher) return;
    setLoading(true);
    try {
      // Update student's teacher
      await supabase
        .from("students")
        .update({ assigned_teacher_id: selectedTeacher })
        .eq("id", studentId);

      // Update upcoming sessions to new teacher
      await supabase
        .from("sessions")
        .update({ teacher_id: selectedTeacher })
        .eq("student_id", studentId)
        .eq("status", "upcoming");

      toast({
        title: "تم التحويل",
        description: `تم تحويل ${studentName} للمعلم الجديد بنجاح${conflicts.length > 0 ? ". يرجى مراجعة تعارضات المواعيد" : ""}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تحويل الطالب: {studentName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>المعلم الجديد</Label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {checking && <p className="text-xs text-muted-foreground">جاري فحص تعارض المواعيد...</p>}

          {conflicts.length > 0 && (
            <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-warning font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                تعارض في المواعيد!
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {c.day} الساعة {c.time} — تعارض مع الطالب: {c.conflictStudent}
                </p>
              ))}
              <p className="text-xs text-warning">سيتم تحويل الطالب مع إشعار بضرورة تعديل المواعيد</p>
            </div>
          )}

          <Button onClick={handleTransfer} disabled={!selectedTeacher || loading}>
            {loading ? "جاري التحويل..." : conflicts.length > 0 ? "تحويل مع وجود تعارض" : "تأكيد التحويل"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferStudentDialog;
