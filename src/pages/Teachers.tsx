import { useState } from "react";
import { GraduationCap, Plus, Search, Phone, Star, Loader2, Eye, Filter, CheckCircle, XCircle, Globe, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { TeacherProfileViewer } from "@/components/teachers/TeacherProfileViewer";
import { WebsiteVisibilityDialog } from "@/components/teachers/WebsiteVisibilityDialog";
import { TeacherSalaryDialog } from "@/components/teachers/TeacherSalaryDialog";

interface TeacherRow {
  id: string; user_id: string; age: number | null; qualification: string | null;
  subjects: string[]; hourly_rate: number; rating: number | null;
  students_count: number | null; monthly_hours: number | null;
  monthly_waiting_minutes: number | null; monthly_absence_hours: number | null;
  monthly_salary: number | null; is_active: boolean | null;
  profile_completed: boolean | null; gender: string | null;
  show_on_website: boolean | null; website_visible_fields: string[] | null;
  profiles: { full_name: string; whatsapp: string | null } | null;
}

const SUBJECT_KEYS = [
  "tajweed", "quranMemorization", "tafseer", "aqeedah", "fiqh",
  "seerah", "arabicLang", "grammar", "qiraat",
] as const;

const SUBJECT_VALUES = [
  "تجويد", "حفظ قرآن", "تفسير", "عقيدة", "فقه",
  "سيرة نبوية", "لغة عربية", "نحو وصرف", "قراءات",
];

const Teachers = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingTeacherId, setViewingTeacherId] = useState<string | null>(null);
  const [websiteTeacher, setWebsiteTeacher] = useState<TeacherRow | null>(null);
  const [salaryTeacher, setSalaryTeacher] = useState<TeacherRow | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [form, setForm] = useState({
    name: "", password: "", age: "", rate: "", rateCurrency: "USD",
    whatsapp: "", qualification: "", subjects: [] as string[], rating: "", gender: "male",
  });
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin" || role === "manager";
  const { t } = useLanguage();

  const updateGender = useMutation({
    mutationFn: async ({ teacherId, gender }: { teacherId: string; gender: string }) => {
      const { error } = await supabase
        .from("teachers")
        .update({ gender })
        .eq("id", teacherId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({ title: "تم التحديث" });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*, profiles!teachers_profile_user_id_fkey(full_name, whatsapp)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as TeacherRow[]) ?? [];
    },
  });

  const createTeacher = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("create-teacher", {
        body: {
          password: form.password, full_name: form.name,
          whatsapp: form.whatsapp, age: form.age ? Number(form.age) : null,
          hourly_rate: form.rate ? Number(form.rate) : 0,
          rate_currency: form.rateCurrency,
          qualification: form.qualification, subjects: form.subjects,
          gender: form.gender,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setDialogOpen(false);
      setForm({ name: "", password: "", age: "", rate: "", rateCurrency: "USD", whatsapp: "", qualification: "", subjects: [], rating: "", gender: "male" });
      toast({ title: t("teacherCreated") });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const toggleSubject = (subject: string) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const filtered = teachers.filter((teacher) => {
    const matchesSearch = (teacher.profiles?.full_name ?? "").includes(search) ||
      (teacher.profiles?.whatsapp ?? "").includes(search) ||
      (teacher.qualification ?? "").includes(search);
    const matchesSubject = subjectFilter === "all" || (teacher.subjects ?? []).includes(subjectFilter);
    const matchesProfile = profileFilter === "all" ||
      (profileFilter === "complete" && teacher.profile_completed) ||
      (profileFilter === "incomplete" && !teacher.profile_completed);
    const matchesGender = genderFilter === "all" || teacher.gender === genderFilter;
    return matchesSearch && matchesSubject && matchesProfile && matchesGender;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            {t("teachersTitle")}
          </h1>
          <p className="text-muted-foreground">{teachers.length} {t("teachersCount")}</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />{t("addTeacher")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("addTeacherTitle")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <h3 className="font-bold text-sm text-primary border-b pb-1">{t("basicInfo")}</h3>
                <div className="grid gap-2">
                  <Label>{t("fullName")} *</Label>
                  <Input placeholder={t("enterTeacherName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("whatsapp")} * ({t("loginIdentifier")})</Label>
                  <Input placeholder="+201..." dir="ltr" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                  <p className="text-xs text-muted-foreground">{t("phoneIsLoginId")}</p>
                </div>
                <div className="grid gap-2">
                  <Label>{t("password")} *</Label>
                  <Input type="password" placeholder="••••••••" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("age")}</Label>
                    <Input type="number" placeholder={t("enterAge")} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("gender")}</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t("male")}</SelectItem>
                        <SelectItem value="female">{t("female")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{t("qualification")}</Label>
                  <Input placeholder={t("qualificationPlaceholder")} value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
                </div>

                <h3 className="font-bold text-sm text-primary border-b pb-1 mt-2">{t("adminOnly")}</h3>
                <div className="grid gap-2">
                  <Label>{t("subjects")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_VALUES.map((subject, idx) => (
                      <Badge
                        key={subject}
                        variant={form.subjects.includes(subject) ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleSubject(subject)}
                      >
                        {t(SUBJECT_KEYS[idx])}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("hourlyRate")}</Label>
                    <Input type="number" placeholder="0" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("currency")}</Label>
                    <Select value={form.rateCurrency} onValueChange={(v) => setForm({ ...form, rateCurrency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EGP">ج.م EGP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("internalRating")}</Label>
                    <Input type="number" min="1" max="5" step="0.1" placeholder="0" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
                  </div>
                </div>

                <Button onClick={() => createTeacher.mutate()} disabled={createTeacher.isPending}>
                  {createTeacher.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  {t("saveTeacher")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("searchTeachers")} value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        {isAdmin && (
          <>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("subjects")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")} - {t("subjects")}</SelectItem>
                {SUBJECT_VALUES.map((s, idx) => (
                  <SelectItem key={s} value={s}>{t(SUBJECT_KEYS[idx])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("profileStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="complete">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary" />{t("profileComplete")}</span>
                </SelectItem>
                <SelectItem value="incomplete">
                  <span className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-destructive" />{t("profileIncomplete")}</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("gender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allGenders")}</SelectItem>
                <SelectItem value="male">{t("maleTeachers")}</SelectItem>
                <SelectItem value="female">{t("femaleTeachers")}</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
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
                        {(teacher.profiles?.full_name ?? "T")[0]}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {teacher.profiles?.full_name}
                        {isAdmin ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newGender = teacher.gender === "female" ? "male" : "female";
                              updateGender.mutate({ teacherId: teacher.id, gender: newGender });
                            }}
                            title="اضغط لتغيير الجنس"
                          >
                            {teacher.gender === "female" ? t("female") : t("male")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {teacher.gender === "female" ? t("female") : t("male")}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{teacher.qualification}</p>
                        {isAdmin && (
                          teacher.profile_completed
                            ? <CheckCircle className="h-3 w-3 text-primary" />
                            : <XCircle className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdmin && teacher.rating != null && teacher.rating > 0 && (
                    <div className="flex items-center gap-1 text-warning">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-medium">{teacher.rating}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isAdmin && teacher.subjects && teacher.subjects.length > 0 && (
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
                  {teacher.profiles?.whatsapp && (
                    <a
                      href={`https://wa.me/${teacher.profiles.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                      title="واتساب"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                </div>

                {isAdmin && (
                  <>
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-primary">{teacher.students_count ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">{t("studentsLabel")}</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-success">{teacher.monthly_hours ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">{t("hoursPerMonth")}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("monthlyStats")}</p>
                      <div className="grid grid-cols-2 gap-y-1 text-xs">
                        <span className="text-muted-foreground">{t("absenceHours")}:</span>
                        <span className="font-medium">{teacher.monthly_absence_hours ?? 0} {t("hours")}</span>
                        <span className="text-muted-foreground">{t("waitingTime")}:</span>
                        <span className="font-medium">{teacher.monthly_waiting_minutes ?? 0} {t("minutes")}</span>
                        <span className="text-muted-foreground">{t("hourlyRate")}:</span>
                        <span className="font-bold text-primary">{(teacher as any).rate_currency === "EGP" ? "ج.م" : "$"}{teacher.hourly_rate}</span>
                        <span className="text-muted-foreground">{t("salary")}:</span>
                        <span className="font-bold text-primary">{(teacher as any).rate_currency === "EGP" ? "ج.م" : "$"}{teacher.monthly_salary ?? 0}</span>
                      </div>
                    </div>
                  </>
                )}

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => setViewingTeacherId(teacher.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t("viewProfile")}
                    </Button>
                    <Button
                      variant={teacher.show_on_website ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => setWebsiteTeacher(teacher)}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {teacher.show_on_website && <span className="text-xs">{t("websiteVisible")}</span>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeacherProfileViewer
        teacherId={viewingTeacherId}
        open={!!viewingTeacherId}
        onOpenChange={(open) => !open && setViewingTeacherId(null)}
      />

      {websiteTeacher && (
        <WebsiteVisibilityDialog
          teacherId={websiteTeacher.id}
          teacherName={websiteTeacher.profiles?.full_name ?? ""}
          showOnWebsite={websiteTeacher.show_on_website ?? false}
          visibleFields={websiteTeacher.website_visible_fields ?? []}
          open={!!websiteTeacher}
          onOpenChange={(open) => !open && setWebsiteTeacher(null)}
        />
      )}
    </div>
  );
};

export default Teachers;
