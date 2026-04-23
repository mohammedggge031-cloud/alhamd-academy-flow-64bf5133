import { useState, forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Send, AlertTriangle, BookOpen, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import SurahPicker from "@/components/SurahPicker";
import { buildHomeworkMessage } from "@/utils/whatsappLinks";

interface SessionReportDialogProps {
  session: any | null;
  onClose: () => void;
  getStudentName: (s: any) => string;
  levelLabels: Record<string, { label: string; className: string }>;
}

const SessionReportDialog = forwardRef<HTMLDivElement, SessionReportDialogProps>(({ session, onClose, getStudentName, levelLabels }, _ref) => {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [report, setReport] = useState({ student_level: "", session_notes: "", homework: "", admin_alert: false, admin_alert_reason: "" });
  const [homeworkSent, setHomeworkSent] = useState(false);

  const submitReport = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { data: teacher } = await supabase.from("teachers").select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id).single();
      if (!teacher) throw new Error(t("teacherNotFound"));
      const { error } = await supabase.from("session_reports").insert({
        session_id: session.id, teacher_id: teacher.id, student_id: session.student_id,
        student_level: report.student_level, session_notes: report.session_notes || null,
        homework: report.homework || null, admin_alert: report.admin_alert,
        admin_alert_reason: report.admin_alert ? report.admin_alert_reason : null,
      });
      if (error) throw error;
      if (report.homework) setHomeworkSent(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-reports"] });
      if (!report.homework) {
        handleClose();
      }
      toast({ title: t("reportSent") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setReport({ student_level: "", session_notes: "", homework: "", admin_alert: false, admin_alert_reason: "" });
    setHomeworkSent(false);
    onClose();
  };

  if (!session) return null;

  return (
    <Dialog open={!!session} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("sessionReport")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">{getStudentName(session)} · {session.session_date}</p>
          </div>

          <div className="grid gap-2">
            <Label>{t("studentLevel")}</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(levelLabels).map(([key, val]) => (
                <Button key={key} size="sm" type="button"
                  variant={report.student_level === key ? "default" : "outline"}
                  className={report.student_level === key ? val.className : "text-xs"}
                  onClick={() => setReport({ ...report, student_level: key })}>
                  {val.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t("whatHappened")}</Label>
            <Textarea value={report.session_notes} onChange={(e) => setReport({ ...report, session_notes: e.target.value })} />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1">
              <Send className="h-3 w-3" />
              {t("homework")}
            </Label>
            <Textarea value={report.homework} onChange={(e) => setReport({ ...report, homework: e.target.value })} />
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {t("selectSurah")}
              </p>
              <SurahPicker onSelect={(text) => setReport({ ...report, homework: report.homework ? `${report.homework}\n${text}` : text })} />
            </div>
            <p className="text-[10px] text-muted-foreground">{t("homeworkWhatsappHint")}</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="admin-alert" className="rounded"
                checked={report.admin_alert}
                onChange={(e) => setReport({ ...report, admin_alert: e.target.checked })} />
              <Label htmlFor="admin-alert" className="flex items-center gap-1 text-sm cursor-pointer">
                <AlertTriangle className="h-3 w-3 text-warning" />
                {t("adminAlert")}
              </Label>
            </div>
            {report.admin_alert && (
              <Textarea className="text-sm"
                value={report.admin_alert_reason} onChange={(e) => setReport({ ...report, admin_alert_reason: e.target.value })} />
            )}
          </div>

          {homeworkSent ? (
            <div className="space-y-2">
              <p className="text-sm text-success font-medium text-center">✅ {t("reportSent")}</p>
              {report.homework && (
                <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                  onClick={() => {
                    const homeworkMsg = buildHomeworkMessage(getStudentName(session), report.homework, lang);
                    const url = `https://wa.me/?text=${encodeURIComponent(homeworkMsg)}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                    handleClose();
                  }}>
                  <MessageCircle className="h-4 w-4" />
                  {t("sendHomeworkViaWhatsapp")}
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={handleClose}>
                {t("done")}
              </Button>
            </div>
          ) : (
            <Button className="w-full gap-2" disabled={!report.student_level || !report.session_notes?.trim() || !report.homework?.trim() || submitReport.isPending}
              onClick={() => submitReport.mutate()}>
              {submitReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("sendReport")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
SessionReportDialog.displayName = "SessionReportDialog";

export default SessionReportDialog;
