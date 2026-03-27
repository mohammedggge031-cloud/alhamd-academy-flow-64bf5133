import { useState } from "react";
import { FileText, Plus, Loader2, BookOpen, Download, Send, Pencil, Eye, MessageCircle } from "lucide-react";
import { openReportPreview, generateWhatsAppText } from "@/utils/reportGenerator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const emptyForm = {
  student_id: "", report_month: new Date().toISOString().slice(0, 7),
  quran_progress: "", tajweed_level: "", attendance_rating: "",
  behavior_notes: "", strengths: "", weaknesses: "",
  recommendations: "", overall_grade: "",
};

const MonthlyReports = () => {
  const { t, lang } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin" || role === "manager";

  const gradeLabels: Record<string, { label: string; className: string }> = {
    A: { label: t("gradeA"), className: "bg-success text-success-foreground" },
    B: { label: t("gradeB"), className: "bg-primary text-primary-foreground" },
    C: { label: t("gradeC"), className: "bg-accent text-accent-foreground" },
    D: { label: t("gradeD"), className: "bg-warning text-warning-foreground" },
    F: { label: t("gradeF"), className: "bg-destructive text-destructive-foreground" },
  };

  const attendanceLabels: Record<string, string> = {
    excellent: t("excellent"), good: t("good"), average: t("average"), poor: t("poor"),
  };

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["monthly-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_reports")
        .select(`*, students:student_id(name, whatsapp, guardian_whatsapp), teachers:teacher_id(user_id, profiles:user_id(full_name))`)
        .order("report_month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myStudents = [] } = useQuery({
    queryKey: ["my-students-for-reports"],
    enabled: !isAdmin,
    queryFn: async () => {
      const { data: teacher } = await supabase.from("teachers").select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "").single();
      if (!teacher) return [];
      const { data } = await supabase.from("students").select("id, name")
        .eq("assigned_teacher_id", teacher.id).eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ["all-students-reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, name").eq("is_active", true);
      return data ?? [];
    },
  });

  const students = isAdmin ? allStudents : myStudents;

  const saveReport = useMutation({
    mutationFn: async () => {
      let reportId: string | null = null;
      if (editingId) {
        const { error } = await supabase.from("monthly_reports").update({
          quran_progress: form.quran_progress || null,
          tajweed_level: form.tajweed_level || null,
          attendance_rating: form.attendance_rating || null,
          behavior_notes: form.behavior_notes || null,
          strengths: form.strengths || null,
          weaknesses: form.weaknesses || null,
          recommendations: form.recommendations || null,
          overall_grade: form.overall_grade || null,
        }).eq("id", editingId);
        if (error) throw error;
        reportId = editingId;
      } else {
        let teacherId: string;
        if (isAdmin) {
          const { data: student } = await supabase.from("students").select("assigned_teacher_id").eq("id", form.student_id).single();
          teacherId = student?.assigned_teacher_id ?? "";
        } else {
          const { data: teacher } = await supabase.from("teachers").select("id")
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "").single();
          teacherId = teacher?.id ?? "";
        }
        const { data: newReport, error } = await supabase.from("monthly_reports").insert({
          teacher_id: teacherId, student_id: form.student_id,
          report_month: form.report_month + "-01",
          quran_progress: form.quran_progress || null, tajweed_level: form.tajweed_level || null,
          attendance_rating: form.attendance_rating || null, behavior_notes: form.behavior_notes || null,
          strengths: form.strengths || null, weaknesses: form.weaknesses || null,
          recommendations: form.recommendations || null, overall_grade: form.overall_grade || null,
        }).select("id").single();
        if (error) throw error;
        reportId = newReport?.id ?? null;

        // Notify admin/managers (only for new reports from teachers)
        if (!isAdmin && reportId) {
          const studentObj = students.find((s: any) => s.id === form.student_id);
          const { data: profile } = await supabase.from("profiles").select("full_name")
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "").single();
          
          // Get student phone for admin WhatsApp
          const { data: studentData } = await supabase.from("students")
            .select("whatsapp, guardian_whatsapp")
            .eq("id", form.student_id).single();

          supabase.functions.invoke("notify-monthly-report", {
            body: {
              report_id: reportId,
              student_name: studentObj?.name ?? "",
              teacher_name: profile?.full_name ?? "",
              report_month: form.report_month + "-01",
              overall_grade: form.overall_grade || null,
              student_phone: studentData?.guardian_whatsapp || studentData?.whatsapp || "",
            },
          }).catch(console.error); // fire and forget
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      toast({ title: editingId ? t("reportUpdated") : t("reportSaved") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      student_id: r.student_id,
      report_month: r.report_month?.slice(0, 7) ?? "",
      quran_progress: r.quran_progress ?? "",
      tajweed_level: r.tajweed_level ?? "",
      attendance_rating: r.attendance_rating ?? "",
      behavior_notes: r.behavior_notes ?? "",
      strengths: r.strengths ?? "",
      weaknesses: r.weaknesses ?? "",
      recommendations: r.recommendations ?? "",
      overall_grade: r.overall_grade ?? "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const buildReportData = (r: any) => ({
    studentName: r.students?.name ?? "",
    teacherName: r.teachers?.profiles?.full_name ?? "",
    reportMonth: r.report_month,
    overallGrade: r.overall_grade ?? "",
    gradeLabelAr: r.overall_grade && gradeLabels[r.overall_grade] ? gradeLabels[r.overall_grade].label : "",
    attendanceRating: r.attendance_rating ?? "",
    attendanceLabelAr: r.attendance_rating ? (attendanceLabels[r.attendance_rating] ?? r.attendance_rating) : "",
    quranProgress: r.quran_progress ?? "",
    arabicIslamicStudies: r.tajweed_level ?? "",
    strengths: r.strengths ?? "",
    weaknesses: r.weaknesses ?? "",
    behaviorNotes: r.behavior_notes ?? "",
    recommendations: r.recommendations ?? "",
    lang,
  });

  const downloadPdf = (r: any) => {
    openReportPreview(buildReportData(r));
  };

  const sendWhatsapp = (r: any) => {
    const content = generateWhatsAppText(buildReportData(r));
    if (isAdmin) {
      // Admin sends to student/guardian
      const phone = r.students?.guardian_whatsapp || r.students?.whatsapp || "";
      if (!phone) {
        toast({ title: t("error"), description: "لا يوجد رقم واتساب للطالب", variant: "destructive" });
        return;
      }
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const url = `https://wa.me/${encodeURIComponent(cleanPhone)}?text=${encodeURIComponent(content)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // Teacher opens WhatsApp without recipient - they choose who to send to
      const url = `https://wa.me/?text=${encodeURIComponent(content)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            {t("monthlyReportsTitle")}
          </h1>
          <p className="text-muted-foreground">{t("monthlyReportsSubtitle")}</p>
        </div>

        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" />{t("writeReport")}
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm({ ...emptyForm }); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t("editReport") : t("newMonthlyReport")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!editingId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("student")} *</Label>
                  <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("selectStudent")} /></SelectTrigger>
                    <SelectContent>
                      {students.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("month")} *</Label>
                  <input type="month"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.report_month}
                    onChange={(e) => setForm({ ...form, report_month: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>{t("quranProgress")}</Label>
              <Textarea value={form.quran_progress} onChange={(e) => setForm({ ...form, quran_progress: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>{t("arabicIslamicStudies")}</Label>
              <Textarea value={form.tajweed_level} onChange={(e) => setForm({ ...form, tajweed_level: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("attendanceLevel")}</Label>
                <Select value={form.attendance_rating} onValueChange={(v) => setForm({ ...form, attendance_rating: v })}>
                  <SelectTrigger><SelectValue placeholder={t("selectPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">{t("excellent")}</SelectItem>
                    <SelectItem value="good">{t("good")}</SelectItem>
                    <SelectItem value="average">{t("average")}</SelectItem>
                    <SelectItem value="poor">{t("poor")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("overallGrade")}</Label>
                <Select value={form.overall_grade} onValueChange={(v) => setForm({ ...form, overall_grade: v })}>
                  <SelectTrigger><SelectValue placeholder={t("selectPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">{t("gradeA")}</SelectItem>
                    <SelectItem value="B">{t("gradeB")}</SelectItem>
                    <SelectItem value="C">{t("gradeC")}</SelectItem>
                    <SelectItem value="D">{t("gradeD")}</SelectItem>
                    <SelectItem value="F">{t("gradeF")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("strengths")}</Label>
              <Textarea value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>{t("weaknesses")}</Label>
              <Textarea value={form.weaknesses} onChange={(e) => setForm({ ...form, weaknesses: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>{t("behaviorNotes")}</Label>
              <Textarea value={form.behavior_notes} onChange={(e) => setForm({ ...form, behavior_notes: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>{t("recommendations")}</Label>
              <Textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} />
            </div>

            <Button onClick={() => saveReport.mutate()} disabled={saveReport.isPending || (!editingId && !form.student_id)}>
              {saveReport.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {t("saveReport")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-40" />
            <p>{t("noMonthlyReports")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reports.map((r: any) => (
            <Card key={r.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{r.students?.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin && r.teachers?.profiles?.full_name && `${t("teacher")}: ${r.teachers.profiles.full_name} · `}
                      {new Date(r.report_month).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long" })}
                    </p>
                  </div>
                  {r.overall_grade && gradeLabels[r.overall_grade] && (
                    <Badge className={gradeLabels[r.overall_grade].className}>
                      {gradeLabels[r.overall_grade].label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {r.quran_progress && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t("memorizationProgress")}</p>
                    <p>{r.quran_progress}</p>
                  </div>
                )}
                {r.tajweed_level && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t("arabicIslamicStudies")}</p>
                    <p>{r.tajweed_level}</p>
                  </div>
                )}
                {r.attendance_rating && (
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {t("attendance")}: {attendanceLabels[r.attendance_rating] ?? r.attendance_rating}
                    </Badge>
                  </div>
                )}
                {r.strengths && (
                  <div>
                    <p className="text-xs font-medium text-success mb-1">{t("strengths")}</p>
                    <p className="text-xs">{r.strengths}</p>
                  </div>
                )}
                {r.weaknesses && (
                  <div>
                    <p className="text-xs font-medium text-destructive mb-1">{t("weaknesses")}</p>
                    <p className="text-xs">{r.weaknesses}</p>
                  </div>
                )}
                {r.behavior_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t("behaviorNotes")}</p>
                    <p className="text-xs">{r.behavior_notes}</p>
                  </div>
                )}
                {r.recommendations && (
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">{t("recommendations")}</p>
                    <p className="text-xs">{r.recommendations}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openEdit(r)}>
                    <Pencil className="h-3 w-3" /> {t("editReport")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => downloadPdf(r)}>
                    <Download className="h-3 w-3" /> {t("downloadPdf")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs text-[#25D366]" onClick={() => sendWhatsapp(r)}>
                    <MessageCircle className="h-3 w-3" /> {isAdmin ? t("sendReportWhatsapp") : t("sendViaWhatsapp")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthlyReports;
