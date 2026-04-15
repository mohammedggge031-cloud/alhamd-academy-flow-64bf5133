import { memo } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const AlertCards = memo(() => {
  const { t } = useLanguage();
  const { session, isAuthReady, role } = useAuth();
  const queryEnabled = isAuthReady && !!session?.user;

  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueInvoices = [], isLoading: loadingOverdue, isFetching: fetchingOverdue, isError: errorOverdue } = useQuery({
    queryKey: ["dash-overdue", session?.user?.id, today],
    enabled: queryEnabled && role === "admin",
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, due_date, total, students:student_id(name)")
        .eq("status", "pending")
        .lt("due_date", today)
        .order("due_date")
        .limit(5);
      if (error) { console.error("dash-overdue error:", error); throw error; }
      return data ?? [];
    },
  });

  const { data: lowBalance = [], isLoading: loadingLow, isFetching: fetchingLow, isError: errorLow } = useQuery({
    queryKey: ["dash-low-balance", session?.user?.id],
    enabled: queryEnabled,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("name, remaining_hours")
        .eq("is_active", true)
        .lte("remaining_hours", 1)
        .order("remaining_hours");
      if (error) { console.error("dash-low-balance error:", error); throw error; }
      return data ?? [];
    },
  });

  const renderContent = (loading: boolean, hasError: boolean, isEmpty: boolean, emptyMsg: string, children: React.ReactNode) => {
    if (loading || !queryEnabled) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
    if (hasError) return <p className="text-center text-sm text-destructive py-3">حدث خطأ في تحميل البيانات</p>;
    if (isEmpty) return <p className="text-center text-sm text-muted-foreground py-3">{emptyMsg}</p>;
    return children;
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("dashOverdueInvoices")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderContent(loadingOverdue || fetchingOverdue, errorOverdue, overdueInvoices.length === 0, t("dashNoOverdue"),
            overdueInvoices.map((inv: any) => {
              const days = Math.ceil((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
              return (
                <div key={inv.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{inv.students?.name}</p>
                    <p className="text-xs text-muted-foreground">{days} {t("dashOverdueDays")}</p>
                  </div>
                  <span className="text-sm font-bold text-destructive">${inv.total}</span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-warning" />
            {t("dashLowBalance")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderContent(loadingLow || fetchingLow, errorLow, lowBalance.length === 0, t("dashNoLowBalance"),
            lowBalance.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium">{s.name}</p>
                <Badge variant="secondary" className="bg-warning/10 text-warning">
                  {s.remaining_hours} {t("hour")}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
});

AlertCards.displayName = "AlertCards";
export default AlertCards;
