import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface Teacher { id: string; name: string; }

interface TransferStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  currentTeacherId: string | null;
  studentSchedule: any[];
  onSuccess: () => void;
}

const TransferStudentDialog = ({
  open, onOpenChange, studentId, studentName, currentTeacherId, studentSchedule, onSuccess,
}: TransferStudentDialogProps) => {
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const daysMap: Record<string, string> = {
    saturday: t("saturday"), sunday: t("sunday"), monday: t("monday"),
    tuesday: t("tuesday"), wednesday: t("wednesday"), thursday: t("thursday"), friday: t("friday"),
  };

  useEffect(() => {
    if (!open) return;
    const fetchTeachers = async () => {
      const { data } = await supabase.from("teachers").select("id, user_id").eq("is_active", true);
      if (data) {
        const list: Teacher[] = [];
        for (const t of data) {
          if (t.id === currentTeacherId) continue;
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", t.user_id).maybeSingle();
          list.push({ id: t.id, name: profile?.full_name || "Teacher" });
        }
        setTeachers(list);
      }
    };
    fetchTeachers();
  }, [open, currentTeacherId]);

  useEffect(() => {
    if (!selectedTeacher || !studentSchedule?.length) { setConflicts([]); return; }
    const checkConflicts = async () => {
      setChecking(true);
      const { data: otherStudents } = await supabase
        .from("students").select("name, schedule")
        .eq("assigned_teacher_id", selectedTeacher).eq("is_active", true);
      const found: any[] = [];
      if (otherStudents) {
        for (const other of otherStudents) {
          const otherSchedule = (other.schedule as any[]) || [];
          for (const entry of studentSchedule) {
            for (const otherEntry of otherSchedule) {
              if (entry.day === otherEntry.day && entry.time === otherEntry.time) {
                found.push({ day: daysMap[entry.day] || entry.day, time: entry.time, conflictStudent: other.name });
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
      await supabase.from("students").update({ assigned_teacher_id: selectedTeacher }).eq("id", studentId);
      await supabase.from("sessions").update({ teacher_id: selectedTeacher }).eq("student_id", studentId).eq("status", "upcoming");
      toast({
        title: t("transferred"),
        description: t("transferSuccess") + (conflicts.length > 0 ? `. ${t("conflictNote")}` : ""),
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("transferStudent")}: {studentName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("newTeacher")}</Label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger><SelectValue placeholder={t("selectTeacher")} /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {checking && <p className="text-xs text-muted-foreground">{t("checkingConflicts")}</p>}

          {conflicts.length > 0 && (
            <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-warning font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                {t("scheduleConflict")}
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {c.day} {t("at")} {c.time} — {t("conflictWith")}: {c.conflictStudent}
                </p>
              ))}
              <p className="text-xs text-warning">{t("conflictNote")}</p>
            </div>
          )}

          <Button onClick={handleTransfer} disabled={!selectedTeacher || loading}>
            {loading ? t("transferring") : conflicts.length > 0 ? t("transferWithConflict") : t("confirmTransfer")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferStudentDialog;
