import { useState } from "react";
import { CalendarDays, Filter, Plus, Loader2, Check, Clock, XCircle, ShieldAlert } from "lucide-react";
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

const statusConfig: Record<string, { label: string; className: string }> = {
  upcoming: { label: "قادمة", className: "bg-accent text-accent-foreground" },
  confirmed: { label: "مقبولة", className: "bg-primary text-primary-foreground" },
  completed: { label: "مكتملة", className: "bg-success text-success-foreground" },
  absent_student: { label: "غياب طالب", className: "bg-destructive text-destructive-foreground" },
  absent_teacher: { label: "غياب معلم", className: "bg-destructive text-destructive-foreground" },
  cancelled: { label: "ملغاة", className: "bg-muted text-muted-foreground" },
  postponed: { label: "مؤجلة", className: "bg-warning text-warning-foreground" },
};

const Sessions = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{ type: string; sessionId: string } | null>(null);
  const [approvalDetails, setApprovalDetails] = useState("");
  const [addDialog, setAddDialog] = useState(false);
  const [newSession, setNewSession] = useState({ student_id: "", teacher_id: "", session_date: "", start_time: "", duration_minutes: "60" });
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  // Fetch sessions with student and teacher names
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          *,
          students:student_id(name),
          teachers:teacher_id(id, user_id, profiles:user_id(full_name))
        `)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch teachers & students for admin add dialog
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-list"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("id, user_id, profiles:user_id(full_name)");
      return data ?? [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, name");
      return data ?? [];
    },
  });

  // Fetch teacher's approval requests
  const { data: approvalRequests = [] } = useQuery({
    queryKey: ["approval-requests"],
    enabled: !isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Teacher: update session status
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
      toast({ title: "تم تحديث حالة الحصة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Teacher: create approval request
  const createApproval = useMutation({
    mutationFn: async ({ type, sessionId, details }: { type: string; sessionId: string; details: string }) => {
      // Get teacher id
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();
      if (!teacher) throw new Error("لم يتم العثور على بيانات المعلم");

      const { error } = await supabase.from("approval_requests").insert({
        teacher_id: teacher.id,
        session_id: sessionId,
        request_type: type,
        details: { reason: details },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      setApprovalDialog(null);
      setApprovalDetails("");
      toast({ title: "تم إرسال طلب الموافقة للمدير" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Admin: add session
  const addSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sessions").insert({
        student_id: newSession.student_id,
        teacher_id: newSession.teacher_id,
        session_date: newSession.session_date,
        start_time: newSession.start_time || null,
        duration_minutes: parseInt(newSession.duration_minutes),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setAddDialog(false);
      setNewSession({ student_id: "", teacher_id: "", session_date: "", start_time: "", duration_minutes: "60" });
      toast({ title: "تم إضافة الحصة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Admin: handle approval
  const handleApproval = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("approval_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-approvals"] });
      toast({ title: "تم تحديث الطلب" });
    },
  });

  // Admin: fetch pending approvals
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["admin-approvals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_requests")
        .select(`
          *,
          teachers:teacher_id(profiles:user_id(full_name)),
          sessions:session_id(session_date, start_time, students:student_id(name))
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = statusFilter === "all"
    ? sessions
    : sessions.filter((s: any) => s.status === statusFilter);

  const getTeacherName = (s: any) => s.teachers?.profiles?.full_name ?? "—";
  const getStudentName = (s: any) => s.students?.name ?? "—";

  const requestTypeLabels: Record<string, string> = {
    reschedule: "تعديل الجدول",
    transfer: "نقل حصة",
    join_postponed: "دخول حصة مؤجلة",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            {isAdmin ? "إدارة الحصص" : "حصصي"}
          </h1>
          <p className="text-muted-foreground">{sessions.length} حصة</p>
        </div>
        {isAdmin && (
          <Dialog open={addDialog} onOpenChange={setAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />إضافة حصة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>إضافة حصة جديدة</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>المعلم</Label>
                  <Select value={newSession.teacher_id} onValueChange={(v) => setNewSession({ ...newSession, teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>الطالب</Label>
                  <Select value={newSession.student_id} onValueChange={(v) => setNewSession({ ...newSession, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>التاريخ</Label>
                    <Input type="date" value={newSession.session_date} onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>الوقت</Label>
                    <Input type="time" value={newSession.start_time} onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>المدة (دقيقة)</Label>
                  <Input type="number" value={newSession.duration_minutes} onChange={(e) => setNewSession({ ...newSession, duration_minutes: e.target.value })} />
                </div>
                <Button onClick={() => addSession.mutate()} disabled={addSession.isPending}>
                  {addSession.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  حفظ الحصة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Admin: Pending Approvals */}
      {isAdmin && pendingApprovals.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-warning">
              <ShieldAlert className="h-4 w-4" />
              طلبات موافقة معلقة ({pendingApprovals.length})
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
                      قبول
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8"
                      onClick={() => handleApproval.mutate({ id: req.id, status: "rejected" })}>
                      رفض
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
              طلباتي المعلقة
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

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="upcoming">قادمة</SelectItem>
            <SelectItem value="confirmed">مقبولة</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="absent_student">غياب طالب</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
            <SelectItem value="postponed">مؤجلة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد حصص</p>
              )}
              {filtered.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{getStudentName(session)[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{getStudentName(session)}</p>
                      <p className="text-xs text-muted-foreground">
                        {getTeacherName(session)} · {session.start_time?.slice(0, 5) ?? ""} · {session.duration_minutes} دقيقة
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground hidden sm:block">{session.session_date}</span>
                    <Badge variant="secondary" className={statusConfig[session.status]?.className ?? ""}>
                      {statusConfig[session.status]?.label ?? session.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session detail dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تفاصيل الحصة</DialogTitle></DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">الطالب</p>
                  <p className="font-medium">{getStudentName(selectedSession)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">المعلم</p>
                  <p className="font-medium">{getTeacherName(selectedSession)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">التاريخ</p>
                  <p className="font-medium">{selectedSession.session_date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الوقت</p>
                  <p className="font-medium">{selectedSession.start_time?.slice(0, 5) ?? "—"}</p>
                </div>
              </div>

              <Badge variant="secondary" className={statusConfig[selectedSession.status]?.className ?? ""}>
                {statusConfig[selectedSession.status]?.label ?? selectedSession.status}
              </Badge>

              {/* Teacher actions */}
              {!isAdmin && selectedSession.status === "upcoming" && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium">إجراءات</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="gap-1"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "confirmed" })}>
                      <Check className="h-3 w-3" />قبول الحصة
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "absent_student" })}>
                      <XCircle className="h-3 w-3" />غياب طالب
                    </Button>
                  </div>
                </div>
              )}

              {!isAdmin && selectedSession.status === "confirmed" && (
                <Button size="sm" className="w-full bg-success hover:bg-success/90 text-success-foreground gap-1"
                  onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "completed" })}>
                  <Check className="h-3 w-3" />تم إكمال الحصة
                </Button>
              )}

              {/* Teacher: needs approval actions */}
              {!isAdmin && (selectedSession.status === "upcoming" || selectedSession.status === "confirmed") && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">يتطلب موافقة المدير:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => setApprovalDialog({ type: "reschedule", sessionId: selectedSession.id })}>
                      تعديل الجدول
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => setApprovalDialog({ type: "transfer", sessionId: selectedSession.id })}>
                      نقل الحصة
                    </Button>
                  </div>
                </div>
              )}

              {!isAdmin && selectedSession.status === "postponed" && (
                <Button size="sm" variant="outline" className="w-full text-xs"
                  onClick={() => setApprovalDialog({ type: "join_postponed", sessionId: selectedSession.id })}>
                  طلب دخول الحصة المؤجلة (يتطلب موافقة)
                </Button>
              )}

              {/* Admin actions */}
              {isAdmin && selectedSession.status === "upcoming" && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium">إجراءات المدير</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "completed" })}>
                      تمت
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "absent_student" })}>
                      غياب طالب
                    </Button>
                    <Button size="sm" variant="secondary"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "cancelled" })}>
                      إلغاء
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => updateStatus.mutate({ id: selectedSession.id, status: "postponed" })}>
                      تأجيل
                    </Button>
                  </div>
                </div>
              )}

              {selectedSession.notes && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">ملاحظات</p>
                  <p className="font-medium">{selectedSession.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval request dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => { setApprovalDialog(null); setApprovalDetails(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>طلب موافقة — {approvalDialog ? requestTypeLabels[approvalDialog.type] : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>السبب / التفاصيل</Label>
              <Textarea placeholder="اكتب سبب الطلب..." value={approvalDetails} onChange={(e) => setApprovalDetails(e.target.value)} />
            </div>
            <Button className="w-full" disabled={createApproval.isPending}
              onClick={() => approvalDialog && createApproval.mutate({
                type: approvalDialog.type,
                sessionId: approvalDialog.sessionId,
                details: approvalDetails,
              })}>
              {createApproval.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              إرسال الطلب
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sessions;
