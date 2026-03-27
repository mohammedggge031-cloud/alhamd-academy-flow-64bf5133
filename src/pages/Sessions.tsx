import { useState, useMemo } from "react";
import { CalendarDays, Filter, Loader2, FileText, Eye, DollarSign, Badge as BadgeIcon, MessageCircle } from "lucide-react";
import PaginationControls from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { buildHomeworkMessage } from "@/utils/whatsappLinks";
import AddSessionDialog from "@/components/sessions/AddSessionDialog";
import SessionDetailDialog from "@/components/sessions/SessionDetailDialog";
import SessionReportDialog from "@/components/sessions/SessionReportDialog";
import ApprovalRequestDialog from "@/components/sessions/ApprovalRequestDialog";
import PendingApprovalsSection from "@/components/sessions/PendingApprovalsSection";

const Sessions = () => {
  const { t } = useLanguage();
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "manager";

  const statusConfig: Record<string, { label: string; className: string }> = {
    upcoming: { label: t("upcoming"), className: "bg-accent text-accent-foreground" },
    confirmed: { label: t("confirmed"), className: "bg-primary text-primary-foreground" },
    completed: { label: t("completed"), className: "bg-success text-success-foreground" },
    absent_student: { label: t("absent_student"), className: "bg-destructive text-destructive-foreground" },
    absent_teacher: { label: t("absent_teacher"), className: "bg-destructive text-destructive-foreground" },
    cancelled: { label: t("cancelled"), className: "bg-muted text-muted-foreground" },
    postponed: { label: t("postponed"), className: "bg-warning text-warning-foreground" },
  };

  const levelLabels: Record<string, { label: string; className: string }> = {
    excellent: { label: t("excellent"), className: "bg-success text-success-foreground" },
    very_good: { label: t("very_good"), className: "bg-primary text-primary-foreground" },
    good: { label: t("good"), className: "bg-accent text-accent-foreground" },
    weak: { label: t("weak"), className: "bg-destructive text-destructive-foreground" },
  };

  const requestTypeLabels: Record<string, string> = {
    reschedule: t("rescheduleLabel"),
    transfer: t("transferLabel"),
    join_postponed: t("joinPostponedLabel"),
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{ type: string; sessionId: string } | null>(null);
  const [reportDialog, setReportDialog] = useState<any | null>(null);
  const [showMyReports, setShowMyReports] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(`*, students:student_id(name, remaining_hours), teachers:teacher_id(id, user_id, profiles:user_id(full_name))`)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: existingReports = [] } = useQuery({
    queryKey: ["session-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_reports")
        .select(`*, students:student_id(name, whatsapp, guardian_whatsapp), sessions:session_id(session_date, start_time), teachers:teacher_id(profiles:user_id(full_name))`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const reportedSessionIds = new Set(existingReports.map((r: any) => r.session_id));

  const pendingReportSessions = useMemo(() => {
    if (isAdmin) return [];
    return sessions.filter((s: any) => s.status === "completed" && !reportedSessionIds.has(s.id));
  }, [sessions, reportedSessionIds, isAdmin]);

  const filtered = statusFilter === "all" ? sessions : sessions.filter((s: any) => s.status === statusFilter);
  const { page, setPage, totalPages, paginatedItems, totalItems, hasNext, hasPrev } = usePagination(filtered, { pageSize: 50 });
  const getTeacherName = (s: any) => s.teachers?.profiles?.full_name ?? "—";
  const getStudentName = (s: any) => s.students?.name ?? "—";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            {isAdmin ? t("sessionsTitle") : t("mySessions")}
          </h1>
          <p className="text-muted-foreground">{sessions.length} {t("sessionsCount")}</p>
        </div>
        {isAdmin && <AddSessionDialog />}
      </div>

      {!isAdmin && <TeacherSchedule />}

      <PendingApprovalsSection requestTypeLabels={requestTypeLabels} />

      {/* Teacher: Pending report alerts */}
      {!isAdmin && pendingReportSessions.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-destructive">
              <FileText className="h-4 w-4" />
              {t("sessionsNeedReport")} ({pendingReportSessions.length})
            </h3>
            <div className="divide-y divide-border">
              {pendingReportSessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between py-2 gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{getStudentName(session)}</p>
                    <p className="text-xs text-muted-foreground">{session.session_date} · {session.start_time?.slice(0, 5) ?? ""}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 text-xs border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setReportDialog(session)}>
                    <FileText className="h-3 w-3" />{t("sendReport")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="upcoming">{t("upcoming")}</SelectItem>
            <SelectItem value="confirmed">{t("confirmed")}</SelectItem>
            <SelectItem value="completed">{t("completed")}</SelectItem>
            <SelectItem value="absent_student">{t("absent_student")}</SelectItem>
            <SelectItem value="absent_teacher">{t("absent_teacher")}</SelectItem>
            <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
            <SelectItem value="postponed">{t("postponed")}</SelectItem>
          </SelectContent>
        </Select>
      <Button size="sm" variant={showMyReports ? "default" : "outline"} className="gap-1 mr-auto"
          onClick={() => setShowMyReports(!showMyReports)}>
          <Eye className="h-3.5 w-3.5" />
          {isAdmin ? t("viewReports") : t("myReports")}
        </Button>
      </div>

      {/* Reports view */}
      {showMyReports && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isAdmin ? t("allSessionReports") : t("myPreviousReports")} ({existingReports.length})
            </h3>
            {existingReports.length === 0 && (
              <p className="text-center text-muted-foreground py-6">{t("noReportsYet")}</p>
            )}
            <div className="divide-y divide-border">
              {existingReports.map((r: any) => (
                <div key={r.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.students?.name ?? "—"}</p>
                      {isAdmin && r.teachers?.profiles?.full_name && (
                        <p className="text-xs text-muted-foreground">{t("teacher")}: {r.teachers.profiles.full_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{r.sessions?.session_date ?? ""}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={levelLabels[r.student_level]?.className ?? ""}>
                      {levelLabels[r.student_level]?.label ?? r.student_level}
                    </Badge>
                  </div>
                  {r.session_notes && <p className="text-xs text-muted-foreground">{r.session_notes}</p>}
                  {r.homework && (
                    <div className="text-xs bg-muted/50 rounded-lg p-2">
                      <span className="font-medium text-foreground">{t("homeworkLabel")} </span>{r.homework}
                    </div>
                  )}
                  {/* WhatsApp send button for admin/manager */}
                  {isAdmin && r.homework && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-[#25D366]"
                      onClick={() => {
                        const phone = r.students?.guardian_whatsapp || r.students?.whatsapp || "";
                        const msg = buildHomeworkMessage(r.students?.name ?? "", r.homework);
                        if (phone) {
                          const cleanPhone = phone.replace(/[^0-9]/g, "");
                          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                        } else {
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                        }
                      }}>
                      <MessageCircle className="h-3 w-3" /> {t("sendReportToGuardian")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions list */}
      {!showMyReports && (isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t("noSessions")}</p>
              )}
              {paginatedItems.map((session: any) => {
                const statusBorderColors: Record<string, string> = {
                  upcoming: "border-r-4 border-r-accent-foreground",
                  confirmed: "border-r-4 border-r-primary",
                  completed: "border-r-4 border-r-success",
                  absent_student: "border-r-4 border-r-destructive",
                  absent_teacher: "border-r-4 border-r-destructive",
                  cancelled: "border-r-4 border-r-muted-foreground",
                  postponed: "border-r-4 border-r-warning",
                };
                const needsReport = !isAdmin && session.status === "completed" && !reportedSessionIds.has(session.id);
                const studentRemaining = Number(session.students?.remaining_hours) || 0;
                const isUnpaid = studentRemaining <= 0 && (session.status === "upcoming" || session.status === "confirmed");
                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer ${statusBorderColors[session.status] ?? ""} ${needsReport ? "bg-destructive/5" : ""} ${isUnpaid ? "bg-warning/5" : ""}`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{getStudentName(session)[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{getStudentName(session)}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTeacherName(session)} · {session.start_time?.slice(0, 5) ?? ""} · {session.duration_minutes} {t("minutes")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUnpaid && (
                        <Badge variant="secondary" className="text-[10px] bg-warning/20 text-warning border border-warning/30">
                          <DollarSign className="h-3 w-3 ml-1" />{t("unpaid")}
                        </Badge>
                      )}
                      {needsReport && (
                        <Badge variant="secondary" className="text-[10px] bg-destructive/10 text-destructive">
                          <FileText className="h-3 w-3 ml-1" />{t("reportLabel")}
                        </Badge>
                      )}
                      {session.pending_approval && (
                        <Badge variant="secondary" className="text-[10px] bg-warning/10 text-warning">
                          {t("pendingLabel")}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground hidden sm:block">{session.session_date}</span>
                      <Badge variant="secondary" className={statusConfig[session.status]?.className ?? ""}>
                        {statusConfig[session.status]?.label ?? session.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} hasNext={hasNext} hasPrev={hasPrev} />
          </CardContent>
        </Card>
      ))}

      {/* Dialogs */}
      <SessionDetailDialog
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        statusConfig={statusConfig}
        reportedSessionIds={reportedSessionIds}
        onOpenReport={(s) => { setReportDialog(s); }}
        onOpenApproval={(type, sessionId) => setApprovalDialog({ type, sessionId })}
        getStudentName={getStudentName}
        getTeacherName={getTeacherName}
      />

      <SessionReportDialog
        session={reportDialog}
        onClose={() => setReportDialog(null)}
        getStudentName={getStudentName}
        levelLabels={levelLabels}
      />

      <ApprovalRequestDialog
        approval={approvalDialog}
        onClose={() => setApprovalDialog(null)}
        requestTypeLabels={requestTypeLabels}
      />
    </div>
  );
};

export default Sessions;
