import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useState } from "react";

interface PendingApprovalsSectionProps {
  requestTypeLabels: Record<string, string>;
}

const PendingApprovalsSection = ({ requestTypeLabels }: PendingApprovalsSectionProps) => {
  const { t } = useLanguage();
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin" || role === "manager";

  const [confirmApproval, setConfirmApproval] = useState<{ id: string; status: string } | null>(null);

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["admin-approvals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_requests")
        .select(`*, teachers:teacher_id(profiles:user_id(full_name)), sessions:session_id(session_date, start_time, students:student_id(name))`)
        .eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: approvalRequests = [] } = useQuery({
    queryKey: ["approval-requests"],
    enabled: !isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("approval_requests").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleApproval = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await supabase.functions.invoke("handle-approval", { body: { request_id: id, action: status } });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-approvals", "sessions"] });
      toast({ title: t("approvalUpdated") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  return (
    <>
      {/* Admin: Pending Approvals */}
      {isAdmin && pendingApprovals.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-warning">
              <ShieldAlert className="h-4 w-4" />
              {t("pendingApprovals")} ({pendingApprovals.length})
            </h3>
            <div className="divide-y divide-border">
              {pendingApprovals.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{req.teachers?.profiles?.full_name} — {requestTypeLabels[req.request_type]}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.sessions?.students?.name} · {req.sessions?.session_date}
                      {req.details?.reason && ` · "${req.details.reason}"`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground h-8"
                      onClick={() => setConfirmApproval({ id: req.id, status: "approved" })}>
                      {t("approve")}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8"
                      onClick={() => setConfirmApproval({ id: req.id, status: "rejected" })}>
                      {t("reject")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher: My pending requests */}
      {!isAdmin && approvalRequests.filter((r: any) => r.status === "pending").length > 0 && (
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("myPendingRequests")}
            </h3>
            {approvalRequests.filter((r: any) => r.status === "pending").map((r: any) => (
              <div key={r.id} className="text-sm py-1">
                <Badge variant="secondary" className="text-xs">{requestTypeLabels[r.request_type]}</Badge>
                <span className="text-muted-foreground mr-2">{r.details?.reason}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirmApproval}
        onOpenChange={(open) => !open && setConfirmApproval(null)}
        title={confirmApproval?.status === "approved" ? t("confirmApprove") : t("confirmReject")}
        description={confirmApproval?.status === "approved" ? t("confirmApproveDesc") : t("confirmRejectDesc")}
        confirmLabel={confirmApproval?.status === "approved" ? t("approve") : t("reject")}
        variant={confirmApproval?.status === "rejected" ? "destructive" : "default"}
        onConfirm={() => {
          if (confirmApproval) {
            handleApproval.mutate(confirmApproval);
            setConfirmApproval(null);
          }
        }}
        isPending={handleApproval.isPending}
      />
    </>
  );
};

export default PendingApprovalsSection;
