import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Clock, Video, Loader2 } from "lucide-react";

const TeacherSchedule = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("today");

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Get start of week (Saturday)
  const dayOfWeek = today.getDay();
  const saturdayOffset = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + saturdayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // Month range
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["teacher-schedule", user?.id],
    queryFn: async () => {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!teacher) return [];
      const { data, error } = await supabase
        .from("sessions")
        .select("*, students:student_id(name)")
        .eq("teacher_id", teacher.id)
        .gte("session_date", monthStart)
        .lte("session_date", monthEnd)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const todaySessions = useMemo(() => sessions.filter((s: any) => s.session_date === todayStr), [sessions, todayStr]);
  const weekSessions = useMemo(() => sessions.filter((s: any) => s.session_date >= weekStartStr && s.session_date <= weekEndStr), [sessions, weekStartStr, weekEndStr]);

  const statusColors: Record<string, string> = {
    upcoming: "bg-accent text-accent-foreground",
    confirmed: "bg-primary text-primary-foreground",
    completed: "bg-success text-success-foreground",
    absent_student: "bg-destructive text-destructive-foreground",
    postponed: "bg-warning text-warning-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };

  const dayNames: Record<string, string> = {
    "0": t("sunday"), "1": t("monday"), "2": t("tuesday"),
    "3": t("wednesday"), "4": t("thursday"), "5": t("friday"), "6": t("saturday"),
  };

  const renderSessionList = (list: any[], emptyKey: string) => {
    if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    if (list.length === 0) return <p className="text-center text-muted-foreground py-6">{t(emptyKey as any)}</p>;

    // Group by date
    const grouped: Record<string, any[]> = {};
    list.forEach((s: any) => {
      if (!grouped[s.session_date]) grouped[s.session_date] = [];
      grouped[s.session_date].push(s);
    });

    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([date, dateSessions]) => {
          const d = new Date(date);
          const dayName = dayNames[String(d.getDay())];
          return (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {dayName} - {date}
              </p>
              <div className="space-y-2">
                {dateSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center text-xs text-muted-foreground min-w-[50px]">
                        <Clock className="h-3.5 w-3.5 mb-0.5" />
                        {session.start_time?.slice(0, 5) ?? "—"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{session.students?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{session.duration_minutes} {t("minutes")}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={statusColors[session.status] ?? ""}>
                      {t(session.status as any) ?? session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t("mySchedule")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="today" className="text-xs">
              {t("todaySchedule")} ({todaySessions.length})
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs">
              {t("weeklyScheduleView")} ({weekSessions.length})
            </TabsTrigger>
            <TabsTrigger value="month" className="text-xs">
              {t("monthlyScheduleView")} ({sessions.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="today">{renderSessionList(todaySessions, "noSessionsToday")}</TabsContent>
          <TabsContent value="week">{renderSessionList(weekSessions, "noSessionsThisWeek")}</TabsContent>
          <TabsContent value="month">{renderSessionList(sessions, "noSessionsThisMonth")}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TeacherSchedule;
