import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface ApprovalRequestDialogProps {
  approval: { type: string; sessionId: string } | null;
  onClose: () => void;
  requestTypeLabels: Record<string, string>;
}

const ApprovalRequestDialog = ({ approval, onClose, requestTypeLabels }: ApprovalRequestDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [details, setDetails] = useState("");

  const createApproval = useMutation({
    mutationFn: async ({ type, sessionId, approvalDetails, changes }: { type: string; sessionId: string; approvalDetails: string; changes?: any }) => {
      const { data: teacher } = await supabase.from("teachers").select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id).single();
      if (!teacher) throw new Error(t("teacherNotFound"));
      const { data: originalSession } = await supabase.from("sessions")
        .select("session_date, start_time, duration_minutes, status").eq("id", sessionId).single();
      if (changes) {
        await supabase.from("sessions").update({
          ...changes, pending_approval: true, approval_status: "pending", original_data: originalSession,
        }).eq("id", sessionId);
      }
      const { error } = await supabase.from("approval_requests").insert({
        teacher_id: teacher.id, session_id: sessionId, request_type: type,
        details: { reason: approvalDetails, ...(changes || {}) }, original_data: originalSession,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", "approval-requests", "admin-approvals"] });
      handleClose();
      toast({ title: t("approvalSent") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setDetails("");
    onClose();
  };

  if (!approval) return null;

  return (
    <Dialog open={!!approval} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {approval.type === "reschedule" ? t("reschedule") : `${t("submitRequest")} — ${requestTypeLabels[approval.type] ?? ""}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {approval.type === "reschedule" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("rescheduleNote")}</p>
              <div className="grid gap-2">
                <Label>{t("newDate")}</Label>
                <Input type="date" id="edit-date" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>{t("newTime")}</Label>
                  <Input type="time" id="edit-time" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("durationMin")}</Label>
                  <Input type="number" id="edit-duration" defaultValue="60" />
                </div>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label>{t("reason")}</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <Button className="w-full" disabled={createApproval.isPending}
            onClick={() => {
              const changes = approval.type === "reschedule" ? {
                session_date: (document.getElementById("edit-date") as HTMLInputElement)?.value || undefined,
                start_time: (document.getElementById("edit-time") as HTMLInputElement)?.value || undefined,
                duration_minutes: parseInt((document.getElementById("edit-duration") as HTMLInputElement)?.value) || undefined,
              } : undefined;
              createApproval.mutate({
                type: approval.type, sessionId: approval.sessionId,
                approvalDetails: details, changes,
              });
            }}>
            {createApproval.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            {approval.type === "reschedule" ? t("editAndSubmit") : t("submitRequest")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalRequestDialog;
