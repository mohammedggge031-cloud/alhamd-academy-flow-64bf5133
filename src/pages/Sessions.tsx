import { useState, useMemo } from "react";
import { CalendarDays, Filter, Plus, Loader2, Check, Clock, XCircle, ShieldAlert, FileText, AlertTriangle, Send, BookOpen, Eye, DollarSign, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import SurahPicker from "@/components/SurahPicker";
import { useLanguage } from "@/i18n/LanguageContext";
import TeacherSchedule from "@/components/teachers/TeacherSchedule";
import { openWhatsApp, buildHomeworkMessage } from "@/utils/whatsappLinks";

const Sessions = () => {
  const { t } = useLanguage();

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
  const [approvalDetails, setApprovalDetails] = useState("");
  const [addDialog, setAddDialog] = useState(false);
  const [newSession, setNewSession] = useState({ student_id: "", teacher_id: "", session_date: "", start_time: "", duration_minutes: "60" });
  const [reportDialog, setReportDialog] = useState<any | null>(null);
  const [report, setReport] = useState({ student_level: "", session_notes: "", homework: "", admin_alert: false, admin_alert_reason: "" });
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin" || role === "manager";

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

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-list"], enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("id, user_id, profiles:user_id(full_name)");
      return data ?? [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-list"], enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, name");
      return data ?? [];
    },
  });

  const { data: approvalRequests = [] } = useQuery({
    queryKey: ["approval-requests"], enabled: !isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("approval_requests").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: existingReports = [] } = useQuery({
    queryKey: ["session-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_reports")
        .select(`*, students:student_id(name), sessions:session_id(session_date, start_time)`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const reportedSessionIds = new Set(existingReports.map((r: any) => r.session_id));

  const pendingReportSessions = useMemo(() => {
    if (isAdmin) return [];
    return sessions.filter((s: any) => s.status === "completed" && !reportedSessionIds.has(s.id));
  }, [sessions, reportedSessionIds, isAdmin]);

  const [showMyReports, setShowMyReports] = useState(false);

  // Get admin/manager WhatsApp for homework forwarding
  const { data: supervisorPhone } = useQuery({
    queryKey: ["supervisor-phone"],
    enabled: !isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "manager"])
        .limit(1);
      if (!data?.[0]) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("whatsapp")
        .eq("user_id", data[0].user_id)
        .single();
      return profile?.whatsapp || null;
    },
  });

  const [homeworkSentForSession, setHomeworkSentForSession] = useState<string | null>(null);

  const submitReport = useMutation({
    mutationFn: async (session: any) => {
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
      // Store session id so we can show WhatsApp button after success
      if (report.homework) {
        setHomeworkSentForSession(session.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-reports"] });
      // Don't close dialog immediately if homework exists - show WhatsApp button
      if (!report.homework) {
        setReportDialog(null);
        setReport({ student_level: "", session_notes: "", homework: "", admin_alert: false, admin_alert_reason: "" });
      }
      toast({ title: t("reportSent") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, waiting_minutes }: { id: string; status: string; waiting_minutes?: number }) => {
      const update: any = { status };
      if (waiting_minutes !== undefined) update.waiting_minutes = waiting_minutes;
      const { error } = await supabase.from("sessions").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setSelectedSession(null);
      toast({ title: t("statusUpdated") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const createApproval = useMutation({
    mutationFn: async ({ type, sessionId, details, changes }: { type: string; sessionId: string; details: string; changes?: any }) => {
      const { data: teacher } = await supabase.from("teachers").select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id).single();
      if (!teacher) throw new Error(t("teacherNotFound"));
      const { data: originalSession } = await supabase.from("sessions")
        .select("session_date, start_time, duration_minutes, status").eq("id", sessionId).single();
      if (changes) {
        await supabase.from("sessions").update({
          ...changes, pending_approval: true, approval_status: "pending", original_data: originalSession,
        }).eq("id", sessionId);
      } else if (type === "join_postponed") {
        await supabase.from("sessions").update({
          status: "completed", pending_approval: true, approval_status: "pending", original_data: originalSession,
        }).eq("id", sessionId);
      }
      const { error } = await supabase.from("approval_requests").insert({
        teacher_id: teacher.id, session_id: sessionId, request_type: type,
        details: { reason: details, ...(changes || {}) }, original_data: originalSession,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", "approval-requests", "admin-approvals"] });
      setApprovalDialog(null); setApprovalDetails(""); setSelectedSession(null);
      toast({ title: t("approvalSent") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const addSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sessions").insert({
        student_id: newSession.student_id, teacher_id: newSession.teacher_id,
        session_date: newSession.session_date, start_time: newSession.start_time || null,
        duration_minutes: parseInt(newSession.duration_minutes),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setAddDialog(false);
      setNewSession({ student_id: "", teacher_id: "", session_date: "", start_time: "", duration_minutes: "60" });
      toast({ title: t("sessionAdded") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
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

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["admin-approvals"], enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_requests")
        .select(`*, teachers:teacher_id(profiles:user_id(full_name)), sessions:session_id(session_date, start_time, students:student_id(name))`)
        .eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = statusFilter === "all" ? sessions : sessions.filter((s: any) => s.status === statusFilter);
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
        {isAdmin && (
          <Dialog open={addDialog} onOpenChange={setAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />{t("addSession")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{t("addSessionTitle")}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t("teacher")}</Label>
                  <Select value={newSession.teacher_id} onValueChange={(v) => setNewSession({ ...newSession, teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("selectTeacher")} /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("student")}</Label>
                  <Select value={newSession.student_id} onValueChange={(v) => setNewSession({ ...newSession, student_id: v })}>
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
                    <Input type="date" value={newSession.session_date} onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("time")}</Label>
                    <Input type="time" value={newSession.start_time} onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{t("durationMin")}</Label>
                  <Input type="number" value={newSession.duration_minutes} onChange={(e) => setNewSession({ ...newSession, duration_minutes: e.target.value })} />
                </div>
                <Button onClick={() => addSession.mutate()} disabled={addSession.isPending}>
                  {addSession.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  {t("saveSession")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      )}
      </div>

      {/* Teacher: Schedule overview */}
      {!isAdmin && <TeacherSchedule />}

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
                      onClick={() => handleApproval.mutate({ id: req.id, status: "approved" })}>
                      {t("approve")}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8"
                      onClick={() => handleApproval.mutate({ id: req.id, status: "rejected" })}>
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
                    onClick={() => { setReportDialog(session); }}>
                    <FileText className="h-3 w-3" />{t("sendReport")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + My Reports toggle */}
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
        {!isAdmin && (
          <Button size="sm" variant={showMyReports ? "default" : "outline"} className="gap-1 mr-auto"
            onClick={() => setShowMyReports(!showMyReports)}>
            <Eye className="h-3.5 w-3.5" />
            {t("myReports")}
          </Button>
        )}
      </div>

      {/* My Reports view */}
      {!isAdmin && showMyReports && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("myPreviousReports")} ({existingReports.length})
            </h3>
            {existingReports.length === 0 && (
              <p className="text-center text-muted-foreground py-6">{t("noReportsYet")}</p>
            )}
            <div className="divide-y divide-border">
              {existingReports.map((r: any) => (
                <div key={r.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{r.students?.name ?? "—"}</p>
                    <span className="text-xs text-muted-foreground">{r.sessions?.session_date ?? ""}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={levelLabels[r.student_level]?.className ?? ""}>
                      {levelLabels[r.student_level]?.label ?? r.student_level}
                    </Badge>
                    {r.admin_alert && (
                      <Badge variant="secondary" className="bg-warning/10 text-warning text-[10px]">
                        <AlertTriangle className="h-3 w-3 ml-1" />{t("adminAlertBadge")}
                      </Badge>
                    )}
                  </div>
                  {r.session_notes && <p className="text-xs text-muted-foreground">{r.session_notes}</p>}
                  {r.homework && (
                    <div className="text-xs bg-muted/50 rounded-lg p-2">
                      <span className="font-medium text-foreground">{t("homeworkLabel")} </span>{r.homework}
                    </div>
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
              {filtered.map((session: any) => {
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
          </CardContent>
        </Card>
      ))}

      {/* Session detail dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("sessionDetails")}</DialogTitle></DialogHeader>
          {selectedSession && (
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
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="gap-1"
                      onClick={async () => {
                        await updateStatus.mutateAsync({ id: selectedSession.id, status: "confirmed" });
                        // No longer calling send-session-reminder API - using notification system instead
                        // Auto-redirect to Zoom
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
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "absent_student" })}>
                      <XCircle className="h-3 w-3" />{t("markAbsent")}
                    </Button>
                  </div>
                </div>
              )}

              {!isAdmin && selectedSession.status === "confirmed" && (
                <Button size="sm" className="w-full bg-success hover:bg-success/90 text-success-foreground gap-1"
                  onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "completed" })}>
                  <Check className="h-3 w-3" />{t("markComplete")}
                </Button>
              )}

              {/* Teacher: needs approval actions */}
              {!isAdmin && (selectedSession.status === "upcoming" || selectedSession.status === "confirmed") && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">{t("needsApproval")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => setApprovalDialog({ type: "reschedule", sessionId: selectedSession.id })}>
                      {t("reschedule")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => setApprovalDialog({ type: "transfer", sessionId: selectedSession.id })}>
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
                  onClick={() => { setReportDialog(selectedSession); setSelectedSession(null); }}>
                  <FileText className="h-3 w-3" />{t("sendReport")}
                </Button>
              )}

              {!isAdmin && selectedSession.status === "completed" && reportedSessionIds.has(selectedSession.id) && (
                <Badge variant="secondary" className="w-full justify-center py-1.5 bg-success/10 text-success">
                  <Check className="h-3 w-3 ml-1" />{t("reportSentBadge")}
                </Badge>
              )}

              {/* Admin actions */}
              {isAdmin && selectedSession.status === "upcoming" && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium">{t("adminActions")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "completed" })}>
                      {t("done")}
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "absent_student" })}>
                      {t("markAbsent")}
                    </Button>
                    <Button size="sm" variant="secondary"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "cancelled" })}>
                      {t("cancelSession")}
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "postponed" })}>
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
          )}
        </DialogContent>
      </Dialog>

      {/* Session report dialog */}
      <Dialog open={!!reportDialog} onOpenChange={() => { setReportDialog(null); setReport({ student_level: "", session_notes: "", homework: "", admin_alert: false, admin_alert_reason: "" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("sessionReport")}
            </DialogTitle>
          </DialogHeader>
          {reportDialog && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">{getStudentName(reportDialog)} · {reportDialog.session_date}</p>
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
                <p className="text-[10px] text-muted-foreground">{t("homeworkSentToSupervisor")}</p>
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

              {/* Show WhatsApp button after successful submission with homework */}
              {homeworkSentForSession === reportDialog.id ? (
                <div className="space-y-2">
                  <p className="text-sm text-success font-medium text-center">✅ {t("reportSent")}</p>
                  {supervisorPhone && report.homework && (
                    <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                      onClick={() => {
                        openWhatsApp(supervisorPhone, buildHomeworkMessage(getStudentName(reportDialog), report.homework));
                        setReportDialog(null);
                        setReport({ student_level: "", session_notes: "", homework: "", admin_alert: false, admin_alert_reason: "" });
                        setHomeworkSentForSession(null);
                      }}>
                      <MessageCircle className="h-4 w-4" />
                      {t("sendHomeworkToSupervisor")}
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => {
                    setReportDialog(null);
                    setReport({ student_level: "", session_notes: "", homework: "", admin_alert: false, admin_alert_reason: "" });
                    setHomeworkSentForSession(null);
                  }}>
                    {t("done")}
                  </Button>
                </div>
              ) : (
                <Button className="w-full gap-2" disabled={!report.student_level || !report.session_notes?.trim() || !report.homework?.trim() || submitReport.isPending}
                  onClick={() => submitReport.mutate(reportDialog)}>
                  {submitReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t("sendReport")}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval request dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => { setApprovalDialog(null); setApprovalDetails(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {approvalDialog?.type === "reschedule" ? t("reschedule") : `${t("submitRequest")} — ${approvalDialog ? requestTypeLabels[approvalDialog.type] : ""}`}
            </DialogTitle>
          </DialogHeader>
          {approvalDialog && (
            <div className="space-y-4">
              {approvalDialog.type === "reschedule" && (
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
                <Textarea value={approvalDetails} onChange={(e) => setApprovalDetails(e.target.value)} />
              </div>
              <Button className="w-full" disabled={createApproval.isPending}
                onClick={() => {
                  const changes = approvalDialog.type === "reschedule" ? {
                    session_date: (document.getElementById("edit-date") as HTMLInputElement)?.value || undefined,
                    start_time: (document.getElementById("edit-time") as HTMLInputElement)?.value || undefined,
                    duration_minutes: parseInt((document.getElementById("edit-duration") as HTMLInputElement)?.value) || undefined,
                  } : undefined;
                  createApproval.mutate({
                    type: approvalDialog.type, sessionId: approvalDialog.sessionId,
                    details: approvalDetails, changes,
                  });
                }}>
                {createApproval.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                {approvalDialog.type === "reschedule" ? t("editAndSubmit") : t("submitRequest")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sessions;
