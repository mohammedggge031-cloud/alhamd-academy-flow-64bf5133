import { useState } from "react";
import { GraduationCap, Plus, Search, Phone, Star, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TeacherRow {
  id: string;
  user_id: string;
  age: number | null;
  qualification: string | null;
  subjects: string[];
  hourly_rate: number;
  rating: number | null;
  students_count: number | null;
  monthly_hours: number | null;
  monthly_waiting_minutes: number | null;
  monthly_absence_hours: number | null;
  monthly_salary: number | null;
  is_active: boolean | null;
  profiles: { full_name: string; whatsapp: string | null } | null;
}

const Teachers = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", age: "", rate: "", whatsapp: "", qualification: "" });
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*, profiles!teachers_user_id_fkey(full_name, whatsapp)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as TeacherRow[]) ?? [];
    },
  });

  const createTeacher = useMutation({
    mutationFn: async () => {
      // 1. Create auth user via edge function
      const res = await supabase.functions.invoke("create-teacher", {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.name,
          whatsapp: form.whatsapp,
          age: form.age ? Number(form.age) : null,
          hourly_rate: form.rate ? Number(form.rate) : 0,
          qualification: form.qualification,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setDialogOpen(false);
      setForm({ name: "", email: "", password: "", age: "", rate: "", whatsapp: "", qualification: "" });
      toast({ title: "تم إنشاء حساب المعلم بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const filtered = teachers.filter((t) =>
    (t.profiles?.full_name ?? "").includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            إدارة المعلمين
          </h1>
          <p className="text-muted-foreground">{teachers.length} معلمين</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />إضافة معلم</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>إضافة معلم جديد</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>الاسم الكامل</Label>
                  <Input placeholder="أدخل اسم المعلم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" placeholder="teacher@example.com" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>كلمة المرور</Label>
                    <Input type="password" placeholder="••••••••" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>السن</Label>
                    <Input type="number" placeholder="العمر" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>ريت الساعة ($)</Label>
                    <Input type="number" placeholder="0" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>رقم الواتساب</Label>
                  <Input placeholder="+201..." dir="ltr" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>المؤهل الدراسي</Label>
                  <Input placeholder="مثال: إجازة في حفص عن عاصم" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
                </div>
                <Button onClick={() => createTeacher.mutate()} disabled={createTeacher.isPending}>
                  {createTeacher.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  حفظ المعلم
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="بحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((teacher) => (
            <Card key={teacher.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {(teacher.profiles?.full_name ?? "م")[0]}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{teacher.profiles?.full_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{teacher.qualification}</p>
                    </div>
                  </div>
                  {isAdmin && teacher.rating != null && (
                    <div className="flex items-center gap-1 text-warning">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-medium">{teacher.rating}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isAdmin && teacher.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.subjects.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs bg-accent text-accent-foreground">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span dir="ltr">{teacher.profiles?.whatsapp}</span>
                </div>

                {isAdmin && (
                  <>
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-primary">{teacher.students_count ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">طلاب</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-success">{teacher.monthly_hours ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">ساعة/شهر</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">إحصائيات الشهر</p>
                      <div className="grid grid-cols-2 gap-y-1 text-xs">
                        <span className="text-muted-foreground">ساعات الغياب:</span>
                        <span className="font-medium">{teacher.monthly_absence_hours ?? 0} ساعات</span>
                        <span className="text-muted-foreground">وقت الانتظار:</span>
                        <span className="font-medium">{teacher.monthly_waiting_minutes ?? 0} دقيقة</span>
                        <span className="text-muted-foreground">المرتب:</span>
                        <span className="font-bold text-primary">${teacher.monthly_salary ?? 0}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teachers;
