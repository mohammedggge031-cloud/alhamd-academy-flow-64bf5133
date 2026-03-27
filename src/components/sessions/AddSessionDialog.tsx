import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const AddSessionDialog = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: "", teacher_id: "", session_date: "", start_time: "", duration_minutes: "60" });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("id, user_id, profiles:user_id(full_name)");
      return data ?? [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, name");
      return data ?? [];
    },
  });

  const addSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sessions").insert({
        student_id: form.student_id, teacher_id: form.teacher_id,
        session_date: form.session_date, start_time: form.start_time || null,
        duration_minutes: parseInt(form.duration_minutes),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setOpen(false);
      setForm({ student_id: "", teacher_id: "", session_date: "", start_time: "", duration_minutes: "60" });
      toast({ title: t("sessionAdded") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />{t("addSession")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("addSessionTitle")}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t("teacher")}</Label>
            <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
              <SelectTrigger><SelectValue placeholder={t("selectTeacher")} /></SelectTrigger>
              <SelectContent>
                {teachers.map((tc: any) => (
                  <SelectItem key={tc.id} value={tc.id}>{tc.profiles?.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("student")}</Label>
            <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
              <SelectTrigger><SelectValue placeholder={t("selectStudent")} /></SelectTrigger>
              <SelectContent>
                {students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("date")}</Label>
              <Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>{t("time")}</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("durationMin")}</Label>
            <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
          </div>
          <Button onClick={() => addSession.mutate()} disabled={addSession.isPending}>
            {addSession.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            {t("saveSession")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSessionDialog;
