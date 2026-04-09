import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Target } from "lucide-react";

const COLORS = {
  completed: "hsl(var(--success))",
  absent_student: "hsl(var(--destructive))",
  postponed: "hsl(var(--warning))",
  upcoming: "hsl(var(--accent-foreground))",
  cancelled: "hsl(var(--muted-foreground))",
};

const SessionCompletionDonut = memo(() => {
  const { t } = useLanguage();
  const { session, isAuthReady } = useAuth();
  const queryEnabled = isAuthReady && !!session?.user;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["dash-completion-donut", session?.user?.id, monthStart],
    enabled: queryEnabled,
    retry: 1,
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("status")
        .gte("session_date", monthStart);

      if (error) throw error;
      if (!sessions || sessions.length === 0) return null;

      const counts: Record<string, number> = {};
      sessions.forEach((s) => {
        counts[s.status] = (counts[s.status] || 0) + 1;
      });

      const total = sessions.length;
      const completedCount = counts["completed"] || 0;
      const rate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      const chartData = Object.entries(counts)
        .filter(([_, v]) => v > 0)
        .map(([status, value]) => ({
          name: t(status as any) || status,
          value,
          color: COLORS[status as keyof typeof COLORS] || "hsl(var(--muted))",
        }));

      return { chartData, rate, total, completedCount };
    },
  });

  if (isLoading || !queryEnabled) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            {t("dashCompletionRate")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-8">{t("dashNoSessions")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          {t("dashCompletionRate")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data.chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{data.rate}%</p>
              <p className="text-[10px] text-muted-foreground">{t("dashCompletionLabel")}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name} ({entry.value})
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

SessionCompletionDonut.displayName = "SessionCompletionDonut";
export default SessionCompletionDonut;
