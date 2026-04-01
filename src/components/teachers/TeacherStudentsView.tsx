import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Users, Search, CalendarDays, Clock, CheckCircle, XCircle,
  Loader2, ChevronDown, User, BarChart3, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TeacherStudentsView = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthStart = `${selectedMonth}-01`;
  const [y, m] = selectedMonth.split("-").map(Number);
  const monthEnd = new Date(y, m, 0).toISOString().slice(0, 10);
  const monthLabel = format(new Date(y, m - 1), "MMMM yyyy");

  // Fetch teacher
  const { data: teacher } = useQuery({
    queryKey: ["teacher-students-view-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["teacher-my-students", teacher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, age, country, timezone, schedule, session_duration_minutes, is_active, whatsapp, guardian_whatsapp")
        .eq("assigned_teacher_id", teacher!.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!teacher,
  });

  // Fetch all sessions for this month
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["teacher-students-sessions", teacher?.id, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, student_id, session_date, start_time, duration_minutes, status, waiting_minutes, notes")
        .eq("teacher_id", teacher!.id)
        .gte("session_date", monthStart)
        .lte("session_date", monthEnd)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!teacher,
  });

  const isLoading = studentsLoading || sessionsLoading;

  // Student stats
  const studentStats = useMemo(() => {
    const stats: Record<string, {
      total: number; completed: number; absent: number; postponed: number;
      upcoming: number; totalMinutes: number; waitingMinutes: number;
    }> = {};

    students.forEach(s => {
      stats[s.id] = { total: 0, completed: 0, absent: 0, postponed: 0, upcoming: 0, totalMinutes: 0, waitingMinutes: 0 };
    });

    sessions.forEach(s => {
      if (!stats[s.student_id]) return;
      const st = stats[s.student_id];
      st.total++;
      if (s.status === "completed") { st.completed++; st.totalMinutes += s.duration_minutes || 0; }
      else if (s.status === "absent_student") { st.absent++; st.waitingMinutes += s.waiting_minutes || 0; }
      else if (s.status === "postponed") st.postponed++;
      else if (s.status === "upcoming" || s.status === "confirmed") st.upcoming++;
    });

    return stats;
  }, [students, sessions]);

  // Filter sessions by student and/or date
  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (selectedStudent !== "all") {
      list = list.filter(s => s.student_id === selectedStudent);
    }
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      list = list.filter(s => s.session_date === dateStr);
    }
    return list;
  }, [sessions, selectedStudent, selectedDate]);

  // Filtered students for search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q));
  }, [students, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    const completed = sessions.filter(s => s.status === "completed").length;
    const absent = sessions.filter(s => s.status === "absent_student").length;
    const totalHours = sessions
      .filter(s => s.status === "completed")
      .reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;
    return { completed, absent, total: sessions.length, totalHours: Math.round(totalHours * 10) / 10 };
  }, [sessions]);

  const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    completed: { label: t("completed"), className: "bg-success/10 text-success border-success/20", icon: CheckCircle },
    absent_student: { label: t("absent_student"), className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
    postponed: { label: t("postponed"), className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    upcoming: { label: t("upcoming"), className: "bg-accent text-accent-foreground border-accent", icon: CalendarDays },
    confirmed: { label: t("confirmed"), className: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle },
    cancelled: { label: t("cancelled") || "Cancelled", className: "bg-muted text-muted-foreground border-border", icon: XCircle },
  };

  const dayNames: Record<string, string> = {
    "0": t("sunday"), "1": t("monday"), "2": t("tuesday"),
    "3": t("wednesday"), "4": t("thursday"), "5": t("friday"), "6": t("saturday"),
  };

  // Generate month options (last 6 months)
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = format(d, "MMMM yyyy");
      opts.push({ value: val, label });
    }
    return opts;
  }, []);

  const getStudentName = (studentId: string) => students.find(s => s.id === studentId)?.name ?? "—";

  if (!teacher && !isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("myStudents") || "طلابي"}</h1>
            <p className="text-sm text-muted-foreground">{monthLabel}</p>
          </div>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{students.length}</p>
              <p className="text-[10px] text-muted-foreground">{t("studentsLabel") || "الطلاب"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold">{totals.completed}</p>
              <p className="text-[10px] text-muted-foreground">{t("completed")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold">{totals.absent}</p>
              <p className="text-[10px] text-muted-foreground">{t("absence") || "غياب"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{totals.totalHours}</p>
              <p className="text-[10px] text-muted-foreground">{t("teachingHours") || "ساعات التدريس"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students" className="gap-1.5">
            <User className="h-4 w-4" />
            {t("navStudents") || "الطلاب"}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            {t("sessionDetailsTeacher") || "تفاصيل الحصص"}
          </TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search") + "..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("noData")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map(student => {
                const stats = studentStats[student.id];
                if (!stats) return null;
                const hoursCompleted = Math.round((stats.totalMinutes / 60) * 10) / 10;

                return (
                  <Card key={student.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      {/* Student header */}
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{student.name[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{student.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {student.age && <span>{student.age} {t("age") || "سنة"}</span>}
                            {student.country && <span>· {student.country}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-base font-bold">{stats.total}</p>
                          <p className="text-[9px] text-muted-foreground">{t("total") || "الكل"}</p>
                        </div>
                        <div className="rounded-lg bg-success/5 p-2">
                          <p className="text-base font-bold text-success">{stats.completed}</p>
                          <p className="text-[9px] text-muted-foreground">{t("completed")}</p>
                        </div>
                        <div className="rounded-lg bg-destructive/5 p-2">
                          <p className="text-base font-bold text-destructive">{stats.absent}</p>
                          <p className="text-[9px] text-muted-foreground">{t("absence") || "غياب"}</p>
                        </div>
                        <div className="rounded-lg bg-warning/5 p-2">
                          <p className="text-base font-bold text-warning">{stats.postponed}</p>
                          <p className="text-[9px] text-muted-foreground">{t("postponed")}</p>
                        </div>
                      </div>

                      {/* Hours bar */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("teachingHours") || "ساعات التدريس"}</span>
                        <span className="font-semibold">{hoursCompleted} {t("hour")}</span>
                      </div>

                      {/* Quick filter button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1.5"
                        onClick={() => {
                          setSelectedStudent(student.id);
                          const tabsEl = document.querySelector('[data-value="sessions"]') as HTMLElement;
                          tabsEl?.click();
                        }}
                      >
                        <Filter className="h-3 w-3" />
                        {t("sessionDetailsTeacher") || "تفاصيل الحصص"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t("all") + " " + (t("navStudents") || "الطلاب")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")} {t("navStudents") || "الطلاب"}</SelectItem>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-[200px] justify-start text-start font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarDays className="me-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "yyyy-MM-dd") : (t("filterByDate") || "فلتر بالتاريخ")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {(selectedStudent !== "all" || selectedDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedStudent("all"); setSelectedDate(undefined); }}>
                {t("clearFilters") || "مسح الفلتر"}
              </Button>
            )}
          </div>

          {/* Sessions Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("noData")}
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">{t("date")}</TableHead>
                      <TableHead className="text-xs">{t("student")}</TableHead>
                      <TableHead className="text-xs">{t("time")}</TableHead>
                      <TableHead className="text-xs text-center">{t("duration") || "المدة"}</TableHead>
                      <TableHead className="text-xs text-center">{t("status")}</TableHead>
                      <TableHead className="text-xs">{t("notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map(session => {
                      const cfg = statusConfig[session.status];
                      const d = new Date(session.session_date);
                      const dayName = dayNames[String(d.getDay())];

                      return (
                        <TableRow key={session.id} className="hover:bg-muted/20">
                          <TableCell className="text-xs">
                            <div>
                              <p className="font-medium">{session.session_date}</p>
                              <p className="text-muted-foreground text-[10px]">{dayName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{getStudentName(session.student_id)}</TableCell>
                          <TableCell className="text-xs" dir="ltr">{session.start_time?.slice(0, 5) ?? "—"}</TableCell>
                          <TableCell className="text-xs text-center">{session.duration_minutes} {t("minutes")}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn("text-[10px]", cfg?.className)}>
                              {cfg?.label ?? session.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {session.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Summary footer */}
              <div className="border-t bg-muted/20 p-3 flex flex-wrap gap-4 text-xs">
                <span className="font-medium">{t("total") || "الإجمالي"}: {filteredSessions.length} {t("sessionsCount" as any) || "حصة"}</span>
                <span className="text-success">{t("completed")}: {filteredSessions.filter(s => s.status === "completed").length}</span>
                <span className="text-destructive">{t("absence") || "غياب"}: {filteredSessions.filter(s => s.status === "absent_student").length}</span>
                <span className="text-warning">{t("postponed")}: {filteredSessions.filter(s => s.status === "postponed").length}</span>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherStudentsView;
