import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, XCircle, Clock, FileText, DollarSign, Pause, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";

interface SessionDetailDialogProps {
  session: any | null;
  onClose: () => void;
  statusConfig: Record<string, { label: string; className: string }>;
  reportedSessionIds: Set<string>;
  onOpenReport: (session: any) => void;
  onOpenApproval: (type: string, sessionId: string) => void;
  getStudentName: (s: any) => string;
  getTeacherName: (s: any) => string;
}

const SessionDetailDialog = ({
  session: selectedSession,
  onClose,
  statusConfig,
  reportedSessionIds,
  onOpenReport,
  onOpenApproval,
  getStudentName,
  getTeacherName,
}: SessionDetailDialogProps) => {
  const { t } = useLanguage();
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin" || role === "manager";

  const [confirmAction, setConfirmAction] = useState<{ status: string; label: string } | null>(null);
  const [exceptionMinutes, setExceptionMinutes] = useState("");
  const [showExceptionInput, setShowExceptionInput] = useState(false);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("sessions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dash-today-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dash-monthly-hours"] });
      onClose();
      toast({ title: t("statusUpdated") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const createApproval = useMutation({
    mutationFn: async ({ type, sessionId, details }: { type: string; sessionId: string; details: string }) => {
      const { data: teacher } = await supabase.from("teachers").select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id).single();
      if (!teacher) throw new Error(t("teacherNotFound"));
      const { data: originalSession } = await supabase.from("sessions")
        .select("session_date, start_time, duration_minutes, status").eq("id", sessionId).single();
      if (type === "join_postponed") {
        await supabase.from("sessions").update({
          status: "completed", pending_approval: true, approval_status: "pending", original_data: originalSession,
        }).eq("id", sessionId);
      }
      const { error } = await supabase.from("approval_requests").insert({
        teacher_id: teacher.id, session_id: sessionId, request_type: type,
        details: { reason: details }, original_data: originalSession,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", "approval-requests", "admin-approvals"] });
      onClose();
      toast({ title: t("approvalSent") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const handleStatusWithConfirm = (status: string, label: string) => {
    setConfirmAction({ status, label });
  };

  const executeStatusChange = () => {
    if (!selectedSession || !confirmAction) return;
    updateStatus.mutate({ id: selectedSession.id, status: confirmAction.status });
    setConfirmAction(null);
  };

  if (!selectedSession) return null;

  return (
    <>
      <Dialog open={!!selectedSession} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("sessionDetails")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t("student")}</p>
                <p className="font-medium">{getStudentName(selectedSession)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("teacher")}</p>
                <p className="font-medium">{getTeacherName(selectedSession)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("date")}</p>
                <p className="font-medium">{selectedSession.session_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("time")}</p>
                <p className="font-medium">{selectedSession.start_time?.slice(0, 5) ?? "—"}</p>
              </div>
            </div>

            <Badge variant="secondary" className={statusConfig[selectedSession.status]?.className ?? ""}>
              {statusConfig[selectedSession.status]?.label ?? selectedSession.status}
            </Badge>

            {/* Teacher actions */}
            {!isAdmin && selectedSession.status === "upcoming" && (
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">{t("adminActionsLabel")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" className="gap-1"
                    onClick={async () => {
                      await updateStatus.mutateAsync({ id: selectedSession.id, status: "confirmed" });
                      const { data: teacherData } = await supabase
                        .from("teachers")
                        .select("zoom_link")
                        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
                        .maybeSingle();
                      if (teacherData?.zoom_link) {
                        window.open(teacherData.zoom_link, "_blank");
                      } else {
                        toast({ title: t("setZoomFirst"), variant: "destructive" });
                      }
                    }}>
                    <Check className="h-3 w-3" />{t("acceptSession")}
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1"
                    onClick={() => handleStatusWithConfirm("absent_student", t("markAbsent"))}>
                    <XCircle className="h-3 w-3" />{t("markAbsent")}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1"
                    onClick={() => handleStatusWithConfirm("postponed", t("postponeSession"))}>
                    <Pause className="h-3 w-3" />{t("postponeSession")}
                  </Button>
                </div>
              </div>
            )}

            {!isAdmin && selectedSession.status === "confirmed" && (
              <Button size="sm" className="w-full bg-success hover:bg-success/90 text-success-foreground gap-1"
                onClick={() => handleStatusWithConfirm("completed", t("markComplete"))}>
                <Check className="h-3 w-3" />{t("markComplete")}
              </Button>
            )}

            {!isAdmin && (selectedSession.status === "upcoming" || selectedSession.status === "confirmed") && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">{t("needsApproval")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="text-xs"
                    onClick={() => onOpenApproval("reschedule", selectedSession.id)}>
                    {t("reschedule")}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs"
                    onClick={() => onOpenApproval("transfer", selectedSession.id)}>
                    {t("transferSession")}
                  </Button>
                </div>
              </div>
            )}

            {!isAdmin && selectedSession.status === "postponed" && !selectedSession.pending_approval && (
              <Button size="sm" className="w-full bg-success hover:bg-success/90 text-success-foreground gap-1"
                onClick={() => createApproval.mutate({
                  type: "join_postponed", sessionId: selectedSession.id, details: t("joinPostponedLabel"),
                })}>
                <Check className="h-3 w-3" />{t("joinPostponed")}
              </Button>
            )}

            {!isAdmin && selectedSession.pending_approval && (
              <Badge variant="secondary" className="w-full justify-center py-1.5 bg-warning/10 text-warning">
                <Clock className="h-3 w-3 ml-1" />{t("awaitingApproval")}
              </Badge>
            )}

            {!isAdmin && selectedSession.status === "completed" && !reportedSessionIds.has(selectedSession.id) && (
              <Button size="sm" className="w-full gap-1" variant="outline"
                onClick={() => { onOpenReport(selectedSession); onClose(); }}>
                <FileText className="h-3 w-3" />{t("sendReport")}
              </Button>
            )}

            {!isAdmin && selectedSession.status === "completed" && reportedSessionIds.has(selectedSession.id) && (
              <Badge variant="secondary" className="w-full justify-center py-1.5 bg-success/10 text-success">
                <Check className="h-3 w-3 ml-1" />{t("reportSentBadge")}
              </Badge>
            )}

            {/* Admin: Exception minutes for absent sessions */}
            {isAdmin && selectedSession.status === "absent_student" && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    {lang === "ar" ? "دقائق استثنائية للمعلم" : "Exception Minutes for Teacher"}
                  </Label>
                  {!showExceptionInput && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => {
                        setExceptionMinutes(String(selectedSession.exception_minutes || 0));
                        setShowExceptionInput(true);
                      }}>
                      <Plus className="h-3 w-3" />
                      {lang === "ar" ? "إضافة" : "Add"}
                    </Button>
                  )}
                </div>
                {selectedSession.exception_minutes > 0 && !showExceptionInput && (
                  <p className="text-sm text-muted-foreground">
                    {lang === "ar" ? `تم إضافة ${selectedSession.exception_minutes} دقيقة استثنائية` : `${selectedSession.exception_minutes} exception minutes added`}
                  </p>
                )}
                {showExceptionInput && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={exceptionMinutes}
                      onChange={(e) => setExceptionMinutes(e.target.value)}
                      placeholder={lang === "ar" ? "عدد الدقائق" : "Minutes"}
                      className="w-24"
                    />
                    <Button size="sm" className="gap-1"
                      onClick={async () => {
                        const mins = parseInt(exceptionMinutes) || 0;
                        const { error } = await supabase.from("sessions")
                          .update({ exception_minutes: mins } as any)
                          .eq("id", selectedSession.id);
                        if (error) {
                          toast({ title: t("error"), description: error.message, variant: "destructive" });
                        } else {
                          queryClient.invalidateQueries({ queryKey: ["sessions"] });
                          setShowExceptionInput(false);
                          toast({ title: lang === "ar" ? "تم حفظ الدقائق الاستثنائية" : "Exception minutes saved" });
                        }
                      }}>
                      {lang === "ar" ? "حفظ" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowExceptionInput(false)}>
                      {lang === "ar" ? "إلغاء" : "Cancel"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isAdmin && selectedSession.status === "upcoming" && (
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">{t("adminActions")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => handleStatusWithConfirm("completed", t("done"))}>
                    {t("done")}
                  </Button>
                  <Button size="sm" variant="destructive"
                    onClick={() => handleStatusWithConfirm("absent_student", t("markAbsent"))}>
                    {t("markAbsent")}
                  </Button>
                  <Button size="sm" variant="secondary"
                    onClick={() => handleStatusWithConfirm("cancelled", t("cancelSession"))}>
                    {t("cancelSession")}
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => handleStatusWithConfirm("postponed", t("postponeSession"))}>
                    {t("postponeSession")}
                  </Button>
                </div>
              </div>
            )}

            {selectedSession.notes && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">{t("notes")}</p>
                <p className="font-medium">{selectedSession.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={t("confirmAction")}
        description={`${t("confirmChangeStatus")} "${confirmAction?.label}"?`}
        confirmLabel={confirmAction?.label ?? t("confirm")}
        variant={confirmAction?.status === "absent_student" || confirmAction?.status === "cancelled" ? "destructive" : "default"}
        onConfirm={executeStatusChange}
        isPending={updateStatus.isPending}
      />
    </>
  );
};

export default SessionDetailDialog;
