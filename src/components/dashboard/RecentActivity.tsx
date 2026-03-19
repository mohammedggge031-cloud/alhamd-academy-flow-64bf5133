import { memo } from "react";
import { CalendarPlus, CreditCard, Phone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const RecentActivity = memo(() => {
  const { t } = useLanguage();
  const { session, isAuthReady } = useAuth();
  const queryEnabled = isAuthReady && !!session?.user;
  const navigate = useNavigate();

  const { data: recentBookings = [], isLoading: loadingBookings, isFetching: fetchingBookings, isError: errorBookings } = useQuery({
    queryKey: ["dash-recent-bookings", session?.user?.id],
    enabled: queryEnabled,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trial_bookings")
        .select("id, full_name, phone, course_interest, status, is_read")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) { console.error("dash-bookings error:", error); throw error; }
      return data ?? [];
    },
  });

  const { data: recentSubs = [], isLoading: loadingSubs, isFetching: fetchingSubs, isError: errorSubs } = useQuery({
    queryKey: ["dash-recent-subs", session?.user?.id],
    enabled: queryEnabled,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("id, full_name, phone, plan_name, status, is_read")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) { console.error("dash-subs error:", error); throw error; }
      return data ?? [];
    },
  });

  const newBookingsCount = recentBookings.filter((b: any) => b.status === "new").length;
  const newSubsCount = recentSubs.filter((s: any) => s.status === "new").length;

  const renderContent = (loading: boolean, hasError: boolean, isEmpty: boolean, emptyMsg: string, children: React.ReactNode) => {
    if (loading || !queryEnabled) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
    if (hasError) return <p className="text-center text-sm text-destructive py-3">حدث خطأ في تحميل البيانات</p>;
    if (isEmpty) return <p className="text-center text-sm text-muted-foreground py-3">{emptyMsg}</p>;
    return children;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarPlus className="h-5 w-5 text-primary" />
            {t("dashRecentBookings")}
            {newBookingsCount > 0 && (
              <Badge variant="destructive" className="text-[10px] animate-pulse">{newBookingsCount}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/bookings")} className="text-xs text-primary">
            {t("dashViewAll")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {renderContent(loadingBookings || fetchingBookings, errorBookings, recentBookings.length === 0, t("dashNoBookings"),
            recentBookings.map((b: any) => (
              <div key={b.id} className={`flex items-center justify-between rounded-lg p-3 ${!b.is_read ? "bg-primary/5" : "bg-muted/50"}`}>
                <div className="flex items-center gap-3">
                  {!b.is_read && <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{b.full_name}</p>
                    <p className="text-xs text-muted-foreground">{b.course_interest || t("trialSession")}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" asChild>
                  <a href={`https://wa.me/${b.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            {t("dashRecentSubs")}
            {newSubsCount > 0 && (
              <Badge variant="destructive" className="text-[10px] animate-pulse">{newSubsCount}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/bookings")} className="text-xs text-primary">
            {t("dashViewAll")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {renderContent(loadingSubs || fetchingSubs, errorSubs, recentSubs.length === 0, t("dashNoSubs"),
            recentSubs.map((s: any) => (
              <div key={s.id} className={`flex items-center justify-between rounded-lg p-3 ${!s.is_read ? "bg-primary/5" : "bg-muted/50"}`}>
                <div className="flex items-center gap-3">
                  {!s.is_read && <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.plan_name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" asChild>
                  <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
});

RecentActivity.displayName = "RecentActivity";
export default RecentActivity;
