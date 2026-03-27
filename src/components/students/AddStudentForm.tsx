import { useState, useEffect, useMemo } from "react";
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
interface AddStudentFormProps { onSuccess: () => void; onCancel: () => void; }

const TIMEZONE_KEYS: { value: string; key: string }[] = [
  { value: "Africa/Cairo", key: "tzEgypt" }, { value: "Asia/Riyadh", key: "tzSaudi" },
  { value: "Asia/Dubai", key: "tzUAE" }, { value: "Asia/Kuwait", key: "tzKuwait" },
  { value: "Asia/Bahrain", key: "tzBahrain" }, { value: "Asia/Qatar", key: "tzQatar" },
  { value: "Asia/Muscat", key: "tzOman" }, { value: "Asia/Amman", key: "tzJordan" },
  { value: "Asia/Baghdad", key: "tzIraq" }, { value: "Africa/Tripoli", key: "tzLibya" },
  { value: "Africa/Tunis", key: "tzTunisia" }, { value: "Africa/Algiers", key: "tzAlgeria" },
  { value: "Africa/Casablanca", key: "tzMorocco" }, { value: "Europe/London", key: "tzLondon" },
  { value: "Europe/Istanbul", key: "tzTurkey" }, { value: "America/New_York", key: "tzNewYork" },
  { value: "America/Los_Angeles", key: "tzLA" }, { value: "Asia/Karachi", key: "tzPakistan" },
  { value: "Asia/Kuala_Lumpur", key: "tzMalaysia" }, { value: "Asia/Jakarta", key: "tzIndonesia" },
];

const DAY_KEYS = [
  { value: "saturday", key: "saturday" }, { value: "sunday", key: "sunday" },
  { value: "monday", key: "monday" }, { value: "tuesday", key: "tuesday" },
  { value: "wednesday", key: "wednesday" }, { value: "thursday", key: "thursday" },
  { value: "friday", key: "friday" },
];

const getTimezoneOffset = (tz: string): string => {
  try {
    const now = new Date();
    const egyptTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const studentTime = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const diffHours = (studentTime.getTime() - egyptTime.getTime()) / (1000 * 60 * 60);
    const sign = diffHours >= 0 ? "+" : "";
    return `${sign}${diffHours}`;
  } catch { return ""; }
};

const convertTimeToEgypt = (time: string, fromTz: string): string => {
  if (!time || !fromTz) return "";
  try {
    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    const studentStr = now.toLocaleString("en-US", { timeZone: fromTz });
    const studentDate = new Date(studentStr);
    return new Date(
      studentDate.getTime() -
        (new Date(now.toLocaleString("en-US", { timeZone: fromTz })).getTime() -
          new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime())
    ).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Africa/Cairo",
    });
  } catch { return ""; }
};

const AddStudentForm = ({ onSuccess, onCancel }: AddStudentFormProps) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [country, setCountry] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [guardianWhatsapp, setGuardianWhatsapp] = useState("");
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [teacherId, setTeacherId] = useState("");
  const [paidHours, setPaidHours] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([{ day: "", time: "" }]);

  const tzOffset = useMemo(() => getTimezoneOffset(timezone), [timezone]);

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

  const addScheduleEntry = () => setSchedule([...schedule, { day: "", time: "" }]);
  const removeScheduleEntry = (idx: number) => setSchedule(schedule.filter((_, i) => i !== idx));
  const updateScheduleEntry = (idx: number, field: "day" | "time", value: string) => {
    const updated = [...schedule];
    updated[idx] = { ...updated[idx], [field]: value };
    setSchedule(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !whatsapp.trim()) {
      toast({ title: t("error"), description: t("nameWhatsappRequired"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const validSchedule = schedule.filter((s) => s.day && s.time);
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert([{
          name: name.trim(), age: age ? parseInt(age) : null, country: country.trim() || null,
          whatsapp: whatsapp.trim(), guardian_whatsapp: guardianWhatsapp.trim() || null,
          timezone, assigned_teacher_id: teacherId || null,
          paid_hours: paidHours ? parseFloat(paidHours) : 0,
          remaining_hours: paidHours ? parseFloat(paidHours) : 0,
          session_duration_minutes: parseInt(sessionDuration),
          schedule: validSchedule as any,
        }])
        .select().single();
      if (studentError) {
        if (studentError.message.includes("unique") || studentError.message.includes("duplicate")) {
          toast({ title: t("error"), description: t("whatsappExists"), variant: "destructive" });
        } else { throw studentError; }
        setLoading(false);
        return;
      }
      if (packagePrice && parseFloat(packagePrice) > 0 && student) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        await supabase.from("invoices").insert({
          student_id: student.id, amount: parseFloat(packagePrice), total: parseFloat(packagePrice),
          status: paymentDate ? "paid" : "pending", paid_at: paymentDate || null,
          due_date: dueDate.toISOString().split("T")[0],
        });
      }
      toast({ title: t("success"), description: t("studentAdded") });
      onSuccess();
    } catch (err: any) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="grid gap-4 py-2">
      <h3 className="font-bold text-sm text-primary border-b pb-1">{t("basicInfo")}</h3>
      <div className="grid gap-2">
        <Label>{t("fullName")} *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("enterStudentName")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>{t("age")}</Label>
          <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder={t("enterAge")} />
        </div>
        <div className="grid gap-2">
          <Label>{t("country")}</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("enterCountry")} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>{t("whatsappStudent")} *</Label>
        <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+966..." dir="ltr" />
      </div>
      <div className="grid gap-2">
        <Label>{t("guardianWhatsapp")}</Label>
        <Input value={guardianWhatsapp} onChange={(e) => setGuardianWhatsapp(e.target.value)} placeholder="+966..." dir="ltr" />
      </div>
      <div className="grid gap-2">
        <Label>{t("timezone")}</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONE_KEYS.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>{t(tz.key as any)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tzOffset && timezone !== "Africa/Cairo" && (
          <p className="text-xs text-muted-foreground">{tzOffset} {t("timezoneOffset")}</p>
        )}
      </div>

      <h3 className="font-bold text-sm text-primary border-b pb-1 mt-2">{t("financialInfo")}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>{t("paidHours")}</Label>
          <Input type="number" value={paidHours} onChange={(e) => setPaidHours(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label>{t("packagePrice")}</Label>
          <Input type="number" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>{t("paymentDate")}</Label>
        <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} dir="ltr" />
      </div>

      <h3 className="font-bold text-sm text-primary border-b pb-1 mt-2">{t("studyInfo")}</h3>
      <div className="grid gap-2">
        <Label>{t("assignedTeacher")}</Label>
        <Select value={teacherId} onValueChange={setTeacherId}>
          <SelectTrigger><SelectValue placeholder={t("selectTeacher")} /></SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
            <Select value={entry.day} onValueChange={(v) => updateScheduleEntry(idx, "day", v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder={t("day")} /></SelectTrigger>
              <SelectContent>
                {DAY_KEYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{t(d.key as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="time" value={entry.time} onChange={(e) => updateScheduleEntry(idx, "time", e.target.value)} className="w-32" dir="ltr" />
            {entry.time && timezone !== "Africa/Cairo" && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {t("egyptTime")}: {convertTimeToEgypt(entry.time, timezone)}
              </span>
            )}
            {schedule.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeScheduleEntry(idx)}>✕</Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addScheduleEntry}>{t("addSlot")}</Button>
      </div>

      <div className="flex gap-2 mt-2">
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
          {loading ? t("saving") : t("saveStudent")}
        </Button>
        <Button variant="outline" onClick={onCancel}>{t("cancel")}</Button>
      </div>
    </div>
  );
};

export default AddStudentForm;
