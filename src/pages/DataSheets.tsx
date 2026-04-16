import { FileSpreadsheet, Download, Users, GraduationCap, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const DataSheets = () => {
  const { t, lang } = useLanguage();
  const { role, user } = useAuth();
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // For managers, check which sheets they can access
  const { data: sheetsAccess = [] } = useQuery({
    queryKey: ["my-sheets-access", user?.id],
    queryFn: async () => {
      if (role === "admin") return ["students", "teachers"];
      const { data } = await supabase.from("academy_settings").select("value").eq("key", "data_sheets_access").maybeSingle();
      if (data?.value && user?.id) {
        try {
          const map = JSON.parse(data.value);
          return map[user.id] || [];
        } catch { return []; }
      }
      return [];
    },
    enabled: !!user?.id,
  });

  const canStudents = sheetsAccess.includes("students");
  const canTeachers = sheetsAccess.includes("teachers");

  const generateStudentsSheet = async () => {
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("name, age, country, whatsapp, guardian_whatsapp, remaining_hours, paid_hours, attended_hours, absence_hours, schedule, session_duration_minutes, timezone, is_active, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Header rows
      const headerRows = [
        ["أكاديمية الحمد — Alhamd Academy"],
        ["سجل بيانات الطلاب — Students Registry"],
        [`تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}  |  Export Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`],
        [], // spacer
      ];

      const colHeaders = [
        "#",
        "اسم الطالب\nStudent Name",
        "العمر\nAge",
        "الدولة\nCountry",
        "واتساب الطالب\nStudent WhatsApp",
        "واتساب ولي الأمر\nGuardian WhatsApp",
        "الساعات المدفوعة\nPaid Hours",
        "الساعات المحضورة\nAttended Hours",
        "ساعات الغياب\nAbsence Hours",
        "الرصيد المتبقي\nRemaining Hours",
        "مدة الحصة (دقيقة)\nSession Duration",
        "المنطقة الزمنية\nTimezone",
        "الحالة\nStatus",
        "تاريخ الانضمام\nJoin Date",
      ];

      const dataRows = (data ?? []).map((s, i) => [
        i + 1,
        s.name ?? "",
        s.age ?? "",
        s.country ?? "",
        s.whatsapp ?? "",
        s.guardian_whatsapp ?? "",
        s.paid_hours ?? 0,
        s.attended_hours ?? 0,
        s.absence_hours ?? 0,
        s.remaining_hours ?? 0,
        s.session_duration_minutes ?? 60,
        s.timezone ?? "Africa/Cairo",
        s.is_active ? "نشط — Active" : "غير نشط — Inactive",
        s.created_at ? new Date(s.created_at).toLocaleDateString("en-CA") : "",
      ]);

      const sheetData = [...headerRows, colHeaders, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Column widths
      ws["!cols"] = [
        { wch: 5 },   // #
        { wch: 28 },  // Name
        { wch: 8 },   // Age
        { wch: 16 },  // Country
        { wch: 20 },  // WhatsApp
        { wch: 20 },  // Guardian WhatsApp
        { wch: 14 },  // Paid Hours
        { wch: 14 },  // Attended Hours
        { wch: 14 },  // Absence Hours
        { wch: 14 },  // Remaining
        { wch: 14 },  // Session Duration
        { wch: 18 },  // Timezone
        { wch: 20 },  // Status
        { wch: 16 },  // Join Date
      ];

      // Merge header cells
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Students — الطلاب");

      // Summary sheet
      const activeCount = (data ?? []).filter(s => s.is_active).length;
      const inactiveCount = (data ?? []).filter(s => !s.is_active).length;
      const summaryData = [
        ["أكاديمية الحمد — Alhamd Academy"],
        ["ملخص بيانات الطلاب — Students Summary"],
        [],
        ["البيان — Item", "القيمة — Value"],
        ["إجمالي الطلاب — Total Students", (data ?? []).length],
        ["طلاب نشطون — Active", activeCount],
        ["طلاب غير نشطين — Inactive", inactiveCount],
        ["إجمالي الساعات المدفوعة — Total Paid Hours", (data ?? []).reduce((s, r) => s + Number(r.paid_hours ?? 0), 0)],
        ["إجمالي الساعات المحضورة — Total Attended", (data ?? []).reduce((s, r) => s + Number(r.attended_hours ?? 0), 0)],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 42 }, { wch: 20 }];
      wsSummary["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary — ملخص");

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Alhamd_Students_Registry_${dateStr}.xlsx`);
      toast.success(lang === "ar" ? "تم تحميل سجل الطلاب بنجاح" : "Students registry downloaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  const generateTeachersSheet = async () => {
    setLoadingTeachers(true);
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("user_id, age, gender, qualification, academic_degree, ijazat, subjects, hourly_rate, rate_currency, monthly_salary, monthly_hours, monthly_absence_hours, monthly_waiting_minutes, students_count, zoom_link, is_active, created_at, bio, profiles:user_id(full_name, whatsapp)")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const headerRows = [
        ["أكاديمية الحمد — Alhamd Academy"],
        ["سجل بيانات المعلمين والمعلمات — Teachers Registry"],
        [`تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}  |  Export Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`],
        [],
      ];

      const colHeaders = [
        "#",
        "اسم المعلم/ة\nTeacher Name",
        "الجنس\nGender",
        "العمر\nAge",
        "رقم الواتساب\nWhatsApp",
        "المؤهل العلمي\nQualification",
        "الدرجة الأكاديمية\nDegree",
        "الإجازات\nIjazat",
        "المواد\nSubjects",
        "سعر الساعة\nHourly Rate",
        "العملة\nCurrency",
        "الراتب الشهري\nMonthly Salary",
        "ساعات العمل\nWork Hours",
        "ساعات الغياب\nAbsence Hours",
        "دقائق الانتظار\nWaiting Min.",
        "عدد الطلاب\nStudents",
        "رابط Zoom\nZoom Link",
        "الحالة\nStatus",
        "تاريخ الانضمام\nJoin Date",
      ];

      const dataRows = (data ?? []).map((t: any, i) => [
        i + 1,
        t.profiles?.full_name ?? "",
        t.gender === "female" ? "أنثى — Female" : "ذكر — Male",
        t.age ?? "",
        t.profiles?.whatsapp ?? "",
        t.qualification ?? "",
        t.academic_degree ?? "",
        t.ijazat ?? "",
        Array.isArray(t.subjects) ? t.subjects.join(", ") : "",
        t.hourly_rate ?? 0,
        t.rate_currency ?? "USD",
        t.monthly_salary ?? 0,
        t.monthly_hours ?? 0,
        t.monthly_absence_hours ?? 0,
        t.monthly_waiting_minutes ?? 0,
        t.students_count ?? 0,
        t.zoom_link ?? "",
        t.is_active ? "نشط — Active" : "غير نشط — Inactive",
        t.created_at ? new Date(t.created_at).toLocaleDateString("en-CA") : "",
      ]);

      const sheetData = [...headerRows, colHeaders, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      ws["!cols"] = [
        { wch: 5 },   // #
        { wch: 28 },  // Name
        { wch: 16 },  // Gender
        { wch: 8 },   // Age
        { wch: 20 },  // WhatsApp
        { wch: 22 },  // Qualification
        { wch: 20 },  // Degree
        { wch: 20 },  // Ijazat
        { wch: 24 },  // Subjects
        { wch: 12 },  // Rate
        { wch: 10 },  // Currency
        { wch: 14 },  // Salary
        { wch: 12 },  // Hours
        { wch: 12 },  // Absence
        { wch: 12 },  // Waiting
        { wch: 10 },  // Students
        { wch: 30 },  // Zoom
        { wch: 20 },  // Status
        { wch: 16 },  // Join Date
      ];

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 18 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 18 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 18 } },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Teachers — المعلمون");

      // Summary
      const maleCount = (data ?? []).filter((t: any) => t.gender !== "female" && t.is_active).length;
      const femaleCount = (data ?? []).filter((t: any) => t.gender === "female" && t.is_active).length;
      const summaryData = [
        ["أكاديمية الحمد — Alhamd Academy"],
        ["ملخص بيانات المعلمين — Teachers Summary"],
        [],
        ["البيان — Item", "القيمة — Value"],
        ["إجمالي المعلمين — Total Teachers", (data ?? []).length],
        ["معلمون نشطون — Active", (data ?? []).filter((t: any) => t.is_active).length],
        ["غير نشطين — Inactive", (data ?? []).filter((t: any) => !t.is_active).length],
        ["ذكور (نشطون) — Male (Active)", maleCount],
        ["إناث (نشطات) — Female (Active)", femaleCount],
        ["إجمالي ساعات العمل — Total Hours", (data ?? []).reduce((s, r: any) => s + Number(r.monthly_hours ?? 0), 0)],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 42 }, { wch: 20 }];
      wsSummary["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary — ملخص");

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Alhamd_Teachers_Registry_${dateStr}.xlsx`);
      toast.success(lang === "ar" ? "تم تحميل سجل المعلمين بنجاح" : "Teachers registry downloaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingTeachers(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          {lang === "ar" ? "سجلات البيانات" : "Data Registries"}
        </h1>
        <p className="text-muted-foreground">
          {lang === "ar"
            ? "تصدير سجلات شاملة ومحدثة تلقائياً لبيانات الطلاب والمعلمين"
            : "Export comprehensive, auto-updated registries for students and teachers"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Students Registry Card */}
        {canStudents && (
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {lang === "ar" ? "سجل الطلاب" : "Students Registry"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {lang === "ar"
                    ? "جميع بيانات الطلاب الحاليين والسابقين"
                    : "All current and former students data"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {lang === "ar" ? "الاسم، العمر، الدولة، أرقام التواصل" : "Name, age, country, contact numbers"}</li>
              <li>• {lang === "ar" ? "الساعات المدفوعة والمحضورة والمتبقية" : "Paid, attended, and remaining hours"}</li>
              <li>• {lang === "ar" ? "تاريخ الانضمام وحالة النشاط" : "Join date and activity status"}</li>
              <li>• {lang === "ar" ? "ملخص إحصائي في شيت منفصل" : "Statistical summary in a separate sheet"}</li>
            </ul>
            <Button
              className="w-full gap-2"
              onClick={generateStudentsSheet}
              disabled={loadingStudents}
            >
              {loadingStudents ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {lang === "ar" ? "تحميل سجل الطلاب" : "Download Students Registry"}
            </Button>
          </CardContent>
        </Card>

        {/* Teachers Registry Card */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {lang === "ar" ? "سجل المعلمين" : "Teachers Registry"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {lang === "ar"
                    ? "جميع بيانات المعلمين والمعلمات الحاليين والسابقين"
                    : "All current and former teachers data"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {lang === "ar" ? "الاسم، الجنس، العمر، رقم الواتساب" : "Name, gender, age, WhatsApp"}</li>
              <li>• {lang === "ar" ? "المؤهل، الإجازات، المواد، الدرجة الأكاديمية" : "Qualification, ijazat, subjects, degree"}</li>
              <li>• {lang === "ar" ? "سعر الساعة، الراتب، ساعات العمل" : "Hourly rate, salary, work hours"}</li>
              <li>• {lang === "ar" ? "ملخص إحصائي في شيت منفصل" : "Statistical summary in a separate sheet"}</li>
            </ul>
            <Button
              className="w-full gap-2"
              onClick={generateTeachersSheet}
              disabled={loadingTeachers}
            >
              {loadingTeachers ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {lang === "ar" ? "تحميل سجل المعلمين" : "Download Teachers Registry"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-accent/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            {lang === "ar"
              ? "📌 يتم تحديث البيانات تلقائياً عند كل تحميل — الطلاب والمعلمون المحذوفون يظهرون بحالة \"غير نشط\" ولا يتم إزالتهم من السجل"
              : "📌 Data is auto-updated on each download — Deleted students and teachers appear as \"Inactive\" and are never removed from the registry"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataSheets;
