import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const TIMEZONES = [
  { value: "Africa/Cairo", label: "مصر (القاهرة)" },
  { value: "Asia/Riyadh", label: "السعودية (الرياض)" },
  { value: "Asia/Dubai", label: "الإمارات (دبي)" },
  { value: "Asia/Kuwait", label: "الكويت" },
  { value: "Asia/Bahrain", label: "البحرين" },
  { value: "Asia/Qatar", label: "قطر" },
  { value: "Asia/Muscat", label: "عُمان (مسقط)" },
  { value: "Asia/Amman", label: "الأردن (عمّان)" },
  { value: "Asia/Baghdad", label: "العراق (بغداد)" },
  { value: "Africa/Tripoli", label: "ليبيا (طرابلس)" },
  { value: "Africa/Tunis", label: "تونس" },
  { value: "Africa/Algiers", label: "الجزائر" },
  { value: "Africa/Casablanca", label: "المغرب (الدار البيضاء)" },
  { value: "Europe/London", label: "لندن" },
  { value: "Europe/Istanbul", label: "تركيا (إسطنبول)" },
  { value: "America/New_York", label: "نيويورك" },
  { value: "America/Los_Angeles", label: "لوس أنجلوس" },
  { value: "Asia/Karachi", label: "باكستان (كراتشي)" },
  { value: "Asia/Kuala_Lumpur", label: "ماليزيا" },
  { value: "Asia/Jakarta", label: "إندونيسيا (جاكرتا)" },
];

const DAYS = [
  { value: "saturday", label: "السبت" },
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الاثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
];

interface Teacher {
  id: string;
  name: string;
}

interface ScheduleEntry {
  day: string;
  time: string;
}

interface AddStudentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const getTimezoneOffset = (tz: string): string => {
  try {
    const now = new Date();
    const egyptTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const studentTime = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const diffHours = (studentTime.getTime() - egyptTime.getTime()) / (1000 * 60 * 60);
    const sign = diffHours >= 0 ? "+" : "";
    return `${sign}${diffHours} ساعة عن توقيت مصر`;
  } catch {
    return "";
  }
};

const convertTimeToEgypt = (time: string, fromTz: string): string => {
  if (!time || !fromTz) return "";
  try {
    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    const studentStr = now.toLocaleString("en-US", { timeZone: fromTz });
    const studentDate = new Date(studentStr);
    const egyptStr = new Date(
      studentDate.getTime() -
        (new Date(now.toLocaleString("en-US", { timeZone: fromTz })).getTime() -
          new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime())
    ).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Africa/Cairo",
    });
    return egyptStr;
  } catch {
    return "";
  }
};

const AddStudentForm = ({ onSuccess, onCancel }: AddStudentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Form state
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
        .select("id, user_id")
        .eq("is_active", true);
      if (data) {
        const teacherList: Teacher[] = [];
        for (const t of data) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", t.user_id)
            .maybeSingle();
          teacherList.push({ id: t.id, name: profile?.full_name || "معلم" });
        }
        setTeachers(teacherList);
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
      toast({ title: "خطأ", description: "الاسم ورقم الواتساب مطلوبان", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const validSchedule = schedule.filter((s) => s.day && s.time);

      // Create student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert([{
          name: name.trim(),
          age: age ? parseInt(age) : null,
          country: country.trim() || null,
          whatsapp: whatsapp.trim(),
          guardian_whatsapp: guardianWhatsapp.trim() || null,
          timezone,
          assigned_teacher_id: teacherId || null,
          paid_hours: paidHours ? parseFloat(paidHours) : 0,
          remaining_hours: paidHours ? parseFloat(paidHours) : 0,
          session_duration_minutes: parseInt(sessionDuration),
          schedule: validSchedule as any,
        }])
        .select()
        .single();

      if (studentError) {
        if (studentError.message.includes("unique") || studentError.message.includes("duplicate")) {
          toast({ title: "خطأ", description: "رقم الواتساب مسجل بالفعل", variant: "destructive" });
        } else {
          throw studentError;
        }
        setLoading(false);
        return;
      }

      // Create invoice if financial data provided
      if (packagePrice && parseFloat(packagePrice) > 0 && student) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);

        await supabase.from("invoices").insert({
          student_id: student.id,
          amount: parseFloat(packagePrice),
          total: parseFloat(packagePrice),
          status: paymentDate ? "paid" : "pending",
          paid_at: paymentDate || null,
          due_date: dueDate.toISOString().split("T")[0],
        });
      }

      toast({ title: "تم", description: "تم إضافة الطالب بنجاح" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 py-2">
      {/* Basic Info */}
      <h3 className="font-bold text-sm text-primary border-b pb-1">البيانات الأساسية</h3>
      <div className="grid gap-2">
        <Label>الاسم الكامل *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسم الطالب" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>السن</Label>
          <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="العمر" />
        </div>
        <div className="grid gap-2">
          <Label>الدولة</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="الدولة" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>رقم الواتساب (الطالب) *</Label>
        <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+966..." dir="ltr" />
      </div>
      <div className="grid gap-2">
        <Label>رقم ولي الأمر (واتساب)</Label>
        <Input value={guardianWhatsapp} onChange={(e) => setGuardianWhatsapp(e.target.value)} placeholder="+966..." dir="ltr" />
      </div>
      <div className="grid gap-2">
        <Label>المنطقة الزمنية</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tzOffset && timezone !== "Africa/Cairo" && (
          <p className="text-xs text-muted-foreground">فرق التوقيت: {tzOffset}</p>
        )}
      </div>

      {/* Financial Info */}
      <h3 className="font-bold text-sm text-primary border-b pb-1 mt-2">البيانات المالية</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>عدد الساعات المدفوعة</Label>
          <Input type="number" value={paidHours} onChange={(e) => setPaidHours(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label>سعر الباقة ($)</Label>
          <Input type="number" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>تاريخ الدفع</Label>
        <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} dir="ltr" />
      </div>

      {/* Study Info */}
      <h3 className="font-bold text-sm text-primary border-b pb-1 mt-2">بيانات الدراسة</h3>
      <div className="grid gap-2">
        <Label>المعلم المسند إليه</Label>
        <Select value={teacherId} onValueChange={setTeacherId}>
          <SelectTrigger><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>مدة الحصة (دقيقة)</Label>
        <Select value={sessionDuration} onValueChange={setSessionDuration}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 دقيقة</SelectItem>
            <SelectItem value="45">45 دقيقة</SelectItem>
            <SelectItem value="60">60 دقيقة</SelectItem>
            <SelectItem value="90">90 دقيقة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Weekly Schedule */}
      <div className="grid gap-2">
        <Label>جدول الحصص الأسبوعي</Label>
        {schedule.map((entry, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Select value={entry.day} onValueChange={(v) => updateScheduleEntry(idx, "day", v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="اليوم" /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              value={entry.time}
              onChange={(e) => updateScheduleEntry(idx, "time", e.target.value)}
              className="w-32"
              dir="ltr"
            />
            {entry.time && timezone !== "Africa/Cairo" && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                مصر: {convertTimeToEgypt(entry.time, timezone)}
              </span>
            )}
            {schedule.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeScheduleEntry(idx)}>✕</Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addScheduleEntry}>+ إضافة موعد</Button>
      </div>

      <div className="flex gap-2 mt-2">
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
          {loading ? "جاري الحفظ..." : "حفظ الطالب"}
        </Button>
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
      </div>
    </div>
  );
};

export default AddStudentForm;
