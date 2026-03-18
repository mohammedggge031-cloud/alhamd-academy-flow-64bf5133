import { memo } from "react";
import { CalendarDays, Globe, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const EGYPT_TZ = "Africa/Cairo";

function getStudentLocalTime(egyptTime: string, sessionDate: string, studentTz: string): string | null {
  if (!studentTz || studentTz === EGYPT_TZ) return null;
  try {
    const dateObj = new Date(`${sessionDate}T${egyptTime}:00`);
    const egyptMs = new Date(dateObj.toLocaleString("en-US", { timeZone: EGYPT_TZ })).getTime();
    const studentMs = new Date(dateObj.toLocaleString("en-US", { timeZone: studentTz })).getTime();
    const adjusted = new Date(dateObj.getTime() + (studentMs - egyptMs));
    return adjusted.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return null;
  }
}

const TodaySessions = memo(() => {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);

  const statusMap: Record<string, { label: string; className: string }> = {
    upcoming: { label: t("upcoming"), className: "bg-accent text-accent-foreground" },
    confirmed: { label: t("confirmed"), className: "bg-primary text-primary-foreground" },
    completed: { label: t("completed"), className: "bg-success text-success-foreground" },
    cancelled: { label: t("cancelled"), className: "bg-destructive text-destructive-foreground" },
    absent_student: { label: t("absent_student"), className: "bg-destructive text-destructive-foreground" },
    postponed: { label: t("postponed"), className: "bg-warning text-warning-foreground" },
  };

  const { data: todaySessions = [], isLoading, isError } = useQuery({
    queryKey: ["dash-today-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, session_date, start_time, status, duration_minutes, students:student_id(name, timezone), teachers:teacher_id(user_id, profiles:user_id(full_name))")
        .eq("session_date", today)
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
    retry: 1,
  });

  return (
    <Card className="border-none shadow-sm lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t("dashTodaySessions")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : todaySessions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">{t("dashNoSessions")}</p>
        ) : (
          <TooltipProvider>
            <div className="space-y-3">
              {todaySessions.map((session: any) => {
                const egyptTime = session.start_time?.slice(0, 5) ?? "—";
                const studentTz = session.students?.timezone;
                const studentLocal = session.start_time
                  ? getStudentLocalTime(session.start_time, session.session_date, studentTz)
                  : null;

                return (
                  <div key={session.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {(session.students?.name ?? "?")[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{session.students?.name}</p>
                        <p className="text-xs text-muted-foreground">{session.teachers?.profiles?.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <span className="text-sm font-mono text-foreground">{egyptTime}</span>
                        {studentLocal && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-help">
                                <Globe className="h-2.5 w-2.5" />
                                {studentLocal} {t("studentTime")}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">
                                🇪🇬 {t("egyptTime")}: {egyptTime} · 🌍 {t("studentTime")}: {studentLocal}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <Badge variant="secondary" className={statusMap[session.status]?.className ?? ""}>
                        {statusMap[session.status]?.label ?? session.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
});

TodaySessions.displayName = "TodaySessions";
export default TodaySessions;
