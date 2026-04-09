import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";

const SessionsChart = memo(() => {
  const { t } = useLanguage();
  const { session, isAuthReady } = useAuth();
  const queryEnabled = isAuthReady && !!session?.user;

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ["dash-sessions-chart", session?.user?.id],
    enabled: queryEnabled,
    retry: 1,
    queryFn: async () => {
      const now = new Date();
      const months: { label: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        months.push({
          label: d.toLocaleDateString("ar-EG", { month: "short" }),
          start: d.toISOString().slice(0, 10),
          end: nextMonth.toISOString().slice(0, 10),
        });
      }

      const { data, error } = await supabase
        .from("sessions")
        .select("session_date, status")
        .gte("session_date", months[0].start)
        .lt("session_date", months[months.length - 1].end);

      if (error) throw error;

      return months.map((m) => {
        const monthSessions = (data || []).filter(
          (s) => s.session_date >= m.start && s.session_date < m.end
        );
        return {
          name: m.label,
          completed: monthSessions.filter((s) => s.status === "completed").length,
          absent: monthSessions.filter((s) => s.status === "absent_student").length,
          postponed: monthSessions.filter((s) => s.status === "postponed").length,
        };
      });
    },
  });

  if (isLoading || !queryEnabled) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t("dashSessionsChart")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={30} />
            <Tooltip
              contentStyle={{
                borderRadius: "0.5rem",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: 12,
              }}
            />
            <Bar dataKey="completed" name={t("completed")} fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" name={t("absent_student")} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="postponed" name={t("postponed")} fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-success" />
            {t("completed")}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-destructive" />
            {t("absent_student")}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-warning" />
            {t("postponed")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SessionsChart.displayName = "SessionsChart";
export default SessionsChart;
