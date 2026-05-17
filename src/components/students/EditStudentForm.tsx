import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface Teacher { id: string; name: string; }
interface ScheduleEntry { day: string; time: string; }
interface EditStudentFormProps {
  student: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const DAY_KEYS = [
  { value: "saturday", key: "saturday" }, { value: "sunday", key: "sunday" },
  { value: "monday", key: "monday" }, { value: "tuesday", key: "tuesday" },
  { value: "wednesday", key: "wednesday" }, { value: "thursday", key: "thursday" },
  { value: "friday", key: "friday" },
];

const EditStudentForm = ({ student, onSuccess, onCancel }: EditStudentFormProps) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [name, setName] = useState(student.name || "");
  const [age, setAge] = useState(student.age?.toString() || "");
  const [country, setCountry] = useState(student.country || "");
  const [whatsapp, setWhatsapp] = useState(student.whatsapp || "");
  const [guardianWhatsapp, setGuardianWhatsapp] = useState(student.guardian_whatsapp || "");
  const [teacherId, setTeacherId] = useState(student.assigned_teacher_id || "");
  const [paidHours, setPaidHours] = useState(student.paid_hours?.toString() || "0");
  const [remainingHours, setRemainingHours] = useState(student.remaining_hours?.toString() || "0");
  const [sessionDuration, setSessionDuration] = useState(student.session_duration_minutes?.toString() || "60");
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(
    Array.isArray(student.schedule) && student.schedule.length > 0
      ? student.schedule
      : [{ day: "", time: "" }]
  );

  useEffect(() => {
    const fetchTeachers = async () => {
      const { data } = await supabase
        .from("teachers")
        .select("id, profiles:user_id(full_name)")
        .eq("is_active", true);
      if (data) {
        setTeachers(data.map((t: any) => ({ id: t.id, name: t.profiles?.full_name || "Teacher" })));
      }
    };
    fetchTeachers();
  }, []);

  const addEntry = () => setSchedule([...schedule, { day: "", time: "" }]);
  const removeEntry = (idx: number) => setSchedule(schedule.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, field: "day" | "time", value: string) => {
    const updated = [...schedule];
    updated[idx] = { ...updated[idx], [field]: value };
    setSchedule(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: t("error"), description: t("nameRequired"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const validSchedule = schedule.filter((s) => s.day && s.time);
      const { error } = await supabase
        .from("students")
        .update({
          name: name.trim(),
          age: age ? parseInt(age) : null,
          country: country.trim() || null,
          whatsapp: whatsapp.trim() || null,
          guardian_whatsapp: guardianWhatsapp.trim() || null,
          assigned_teacher_id: teacherId || null,
          paid_hours: paidHours ? parseFloat(paidHours) : 0,
          remaining_hours: remainingHours ? parseFloat(remainingHours) : 0,
          session_duration_minutes: parseInt(sessionDuration),
          schedule: validSchedule as any,
        })
        .eq("id", student.id);
      if (error) throw error;
      toast({ title: t("success"), description: t("studentUpdated") });
      onSuccess();
    } catch (err: any) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label>{t("fullName")} *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>{t("age")}</Label>
          <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>{t("country")}</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>{t("whatsappStudent")}</Label>
        <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} dir="ltr" />
      </div>
      <div className="grid gap-2">
        <Label>{t("guardianWhatsapp")}</Label>
        <Input value={guardianWhatsapp} onChange={(e) => setGuardianWhatsapp(e.target.value)} dir="ltr" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>{t("paidHours")}</Label>
          <Input type="number" value={paidHours} onChange={(e) => setPaidHours(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>{t("remaining")}</Label>
          <Input type="number" value={remainingHours} onChange={(e) => setRemainingHours(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>{t("assignedTeacher")}</Label>
        <Select value={teacherId} onValueChange={setTeacherId}>
          <SelectTrigger><SelectValue placeholder={t("selectTeacher")} /></SelectTrigger>
          <SelectContent>
            {teachers.map((tc) => (
              <SelectItem key={tc.id} value={tc.id}>{tc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{t("sessionDuration")}</Label>
        <Select value={sessionDuration} onValueChange={setSessionDuration}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">{t("thirtyMin")}</SelectItem>
            <SelectItem value="45">{t("fortyFiveMin")}</SelectItem>
            <SelectItem value="60">{t("sixtyMin")}</SelectItem>
            <SelectItem value="90">{t("ninetyMin")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{t("weeklySchedule")}</Label>
        {schedule.map((entry, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Select value={entry.day} onValueChange={(v) => updateEntry(idx, "day", v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder={t("day")} /></SelectTrigger>
              <SelectContent>
                {DAY_KEYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{t(d.key as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="time" value={entry.time} onChange={(e) => updateEntry(idx, "time", e.target.value)} className="w-32" dir="ltr" />
            {schedule.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEntry(idx)}>✕</Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addEntry}>{t("addSlot")}</Button>
      </div>
      <div className="flex gap-2 mt-2">
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
          {loading ? t("saving") : t("saveChanges")}
        </Button>
        <Button variant="outline" onClick={onCancel}>{t("cancel")}</Button>
      </div>
    </div>
  );
};

export default EditStudentForm;
