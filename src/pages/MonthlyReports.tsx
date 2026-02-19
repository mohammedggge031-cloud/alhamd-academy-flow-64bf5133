import { useState } from "react";
import { FileText, Plus, Loader2, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const gradeLabels: Record<string, { label: string; className: string }> = {
  A: { label: "ممتاز", className: "bg-success text-success-foreground" },
  B: { label: "جيد جداً", className: "bg-primary text-primary-foreground" },
  C: { label: "جيد", className: "bg-accent text-accent-foreground" },
  D: { label: "مقبول", className: "bg-warning text-warning-foreground" },
  F: { label: "ضعيف", className: "bg-destructive text-destructive-foreground" },
};

const attendanceLabels: Record<string, string> = {
  excellent: "ممتاز",
  good: "جيد",
  average: "متوسط",
  poor: "ضعيف",
};

const MonthlyReports = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: "",
    report_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    quran_progress: "",
    tajweed_level: "",
    attendance_rating: "",
    behavior_notes: "",
    strengths: "",
    weaknesses: "",
    recommendations: "",
    overall_grade: "",
  });
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  // Fetch reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["monthly-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_reports")
        .select(`
          *,
          students:student_id(name),
          teachers:teacher_id(user_id, profiles:user_id(full_name))
        `)
        .order("report_month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch teacher's students
  const { data: myStudents = [] } = useQuery({
    queryKey: ["my-students-for-reports"],
    enabled: !isAdmin,
    queryFn: async () => {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .single();
      if (!teacher) return [];
      const { data } = await supabase
        .from("students")
        .select("id, name")
        .eq("assigned_teacher_id", teacher.id)
        .eq("is_active", true);
      return data ?? [];
    },
  });

  // For admin: all students
  const { data: allStudents = [] } = useQuery({
    queryKey: ["all-students-reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, name").eq("is_active", true);
      return data ?? [];
    },
  });

  const students = isAdmin ? allStudents : myStudents;

  const createReport = useMutation({
    mutationFn: async () => {
      let teacherId: string;
      if (isAdmin) {
        // Admin can pick any teacher, but for simplicity assign to student's teacher
        const { data: student } = await supabase
          .from("students")
          .select("assigned_teacher_id")
          .eq("id", form.student_id)
          .single();
        teacherId = student?.assigned_teacher_id ?? "";
      } else {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .single();
        teacherId = teacher?.id ?? "";
      }

      const { error } = await supabase.from("monthly_reports").insert({
        teacher_id: teacherId,
        student_id: form.student_id,
        report_month: form.report_month + "-01",
        quran_progress: form.quran_progress || null,
        tajweed_level: form.tajweed_level || null,
        attendance_rating: form.attendance_rating || null,
        behavior_notes: form.behavior_notes || null,
        strengths: form.strengths || null,
        weaknesses: form.weaknesses || null,
        recommendations: form.recommendations || null,
        overall_grade: form.overall_grade || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      setDialogOpen(false);
      setForm({
        student_id: "", report_month: new Date().toISOString().slice(0, 7),
        quran_progress: "", tajweed_level: "", attendance_rating: "",
        behavior_notes: "", strengths: "", weaknesses: "",
        recommendations: "", overall_grade: "",
      });
      toast({ title: "تم حفظ التقرير الشهري بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            التقارير الشهرية للطلاب
          </h1>
          <p className="text-muted-foreground">تقارير شهرية يكتبها المعلم لكل طالب</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />كتابة تقرير</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تقرير شهري جديد</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>الطالب *</Label>
                  <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>الشهر *</Label>
                  <input
                    type="month"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.report_month}
                    onChange={(e) => setForm({ ...form, report_month: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>التقدم في حفظ القرآن</Label>
                <Textarea placeholder="مثال: حفظ سورة البقرة من آية 1 إلى 50" value={form.quran_progress} onChange={(e) => setForm({ ...form, quran_progress: e.target.value })} />
              </div>

              <div className="grid gap-2">
                <Label>مستوى التجويد</Label>
                <Textarea placeholder="ملاحظات حول أداء التجويد" value={form.tajweed_level} onChange={(e) => setForm({ ...form, tajweed_level: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>مستوى الحضور</Label>
                  <Select value={form.attendance_rating} onValueChange={(v) => setForm({ ...form, attendance_rating: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">ممتاز</SelectItem>
                      <SelectItem value="good">جيد</SelectItem>
                      <SelectItem value="average">متوسط</SelectItem>
                      <SelectItem value="poor">ضعيف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>التقدير العام</Label>
                  <Select value={form.overall_grade} onValueChange={(v) => setForm({ ...form, overall_grade: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">ممتاز (A)</SelectItem>
                      <SelectItem value="B">جيد جداً (B)</SelectItem>
                      <SelectItem value="C">جيد (C)</SelectItem>
                      <SelectItem value="D">مقبول (D)</SelectItem>
                      <SelectItem value="F">ضعيف (F)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>نقاط القوة</Label>
                <Textarea placeholder="نقاط القوة لدى الطالب" value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>نقاط الضعف</Label>
                <Textarea placeholder="نقاط الضعف التي تحتاج تحسين" value={form.weaknesses} onChange={(e) => setForm({ ...form, weaknesses: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>ملاحظات سلوكية</Label>
                <Textarea placeholder="ملاحظات عن سلوك الطالب" value={form.behavior_notes} onChange={(e) => setForm({ ...form, behavior_notes: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>التوصيات</Label>
                <Textarea placeholder="توصيات للتحسين" value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} />
              </div>

              <Button onClick={() => createReport.mutate()} disabled={createReport.isPending || !form.student_id}>
                {createReport.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                حفظ التقرير
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-40" />
            <p>لا توجد تقارير شهرية بعد</p>
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
                      {isAdmin && r.teachers?.profiles?.full_name && `المعلم: ${r.teachers.profiles.full_name} · `}
                      {new Date(r.report_month).toLocaleDateString("ar-EG", { year: "numeric", month: "long" })}
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
                    <p className="text-xs font-medium text-muted-foreground mb-1">تقدم الحفظ</p>
                    <p>{r.quran_progress}</p>
                  </div>
                )}
                {r.tajweed_level && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">مستوى التجويد</p>
                    <p>{r.tajweed_level}</p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {r.attendance_rating && (
                    <Badge variant="outline" className="text-xs">
                      الحضور: {attendanceLabels[r.attendance_rating] ?? r.attendance_rating}
                    </Badge>
                  )}
                </div>
                {r.strengths && (
                  <div>
                    <p className="text-xs font-medium text-success mb-1">نقاط القوة</p>
                    <p className="text-xs">{r.strengths}</p>
                  </div>
                )}
                {r.weaknesses && (
                  <div>
                    <p className="text-xs font-medium text-destructive mb-1">نقاط الضعف</p>
                    <p className="text-xs">{r.weaknesses}</p>
                  </div>
                )}
                {r.recommendations && (
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">التوصيات</p>
                    <p className="text-xs">{r.recommendations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthlyReports;
