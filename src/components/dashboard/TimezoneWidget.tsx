import { memo, useState, useEffect } from "react";
import { Globe, ArrowRightLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const EGYPT_TZ = "Africa/Cairo";

function getCurrentTime(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "--:--";
  }
}

function getTimezoneOffset(tz: string): number {
  try {
    const now = new Date();
    const egyptTime = new Date(now.toLocaleString("en-US", { timeZone: EGYPT_TZ }));
    const otherTime = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    return Math.round((otherTime.getTime() - egyptTime.getTime()) / 3600000);
  } catch {
    return 0;
  }
}

function isDSTActive(tz: string): boolean {
  try {
    const jan = new Date(new Date().getFullYear(), 0, 1);
    const jul = new Date(new Date().getFullYear(), 6, 1);
    const janOffset = jan.toLocaleString("en-US", { timeZone: tz, timeZoneName: "shortOffset" });
    const julOffset = jul.toLocaleString("en-US", { timeZone: tz, timeZoneName: "shortOffset" });
    return janOffset !== julOffset;
  } catch {
    return false;
  }
}

const tzDisplayNames: Record<string, string> = {
  "Africa/Cairo": "مصر 🇪🇬",
  "America/New_York": "نيويورك 🇺🇸",
  "America/Chicago": "شيكاغو 🇺🇸",
  "America/Los_Angeles": "لوس أنجلوس 🇺🇸",
  "America/Toronto": "تورنتو 🇨🇦",
  "Europe/London": "لندن 🇬🇧",
  "Europe/Paris": "باريس 🇫🇷",
  "Europe/Berlin": "برلين 🇩🇪",
  "Europe/Istanbul": "إسطنبول 🇹🇷",
  "Asia/Riyadh": "الرياض 🇸🇦",
  "Asia/Dubai": "دبي 🇦🇪",
  "Asia/Kuwait": "الكويت 🇰🇼",
  "Asia/Qatar": "قطر 🇶🇦",
  "Asia/Amman": "عمّان 🇯🇴",
  "Asia/Beirut": "بيروت 🇱🇧",
  "Asia/Baghdad": "بغداد 🇮🇶",
  "Asia/Karachi": "باكستان 🇵🇰",
  "Asia/Kolkata": "الهند 🇮🇳",
  "Asia/Kuala_Lumpur": "ماليزيا 🇲🇾",
  "Asia/Jakarta": "إندونيسيا 🇮🇩",
  "Australia/Sydney": "سيدني 🇦🇺",
};

const TimezoneWidget = memo(() => {
  const { t } = useLanguage();
  const { session, isAuthReady } = useAuth();
  const queryEnabled = isAuthReady && !!session?.user;
  const [currentTimes, setCurrentTimes] = useState<Record<string, string>>({});

  const { data: studentTimezones = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ["student-timezones", session?.user?.id],
    enabled: queryEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("timezone, name")
        .eq("is_active", true)
        .not("timezone", "is", null);
      if (error) {
        console.error("dash-student-timezones error:", error);
        throw error;
      }
      if (!data) return [];

      const tzMap: Record<string, number> = {};
      for (const s of data) {
        const tz = s.timezone || EGYPT_TZ;
        tzMap[tz] = (tzMap[tz] || 0) + 1;
      }

      return Object.entries(tzMap)
        .filter(([tz]) => tz !== EGYPT_TZ)
        .map(([tz, count]) => ({ tz, count }))
        .sort((a, b) => b.count - a.count);
    },
    retry: 1,
  });

  useEffect(() => {
    if (!queryEnabled) {
      setCurrentTimes({});
      return;
    }

    const update = () => {
      const times: Record<string, string> = { [EGYPT_TZ]: getCurrentTime(EGYPT_TZ) };
      for (const { tz } of studentTimezones) {
        times[tz] = getCurrentTime(tz);
      }
      setCurrentTimes(times);
    };

    update();
    // Update every 30 seconds instead of every second for better performance
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [studentTimezones, queryEnabled]);

  const egyptTime = currentTimes[EGYPT_TZ] || "--:--";

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5 text-primary" />
          {t("timezoneWidgetTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇪🇬</span>
            <div>
              <p className="text-sm font-bold text-primary">{t("egyptTime")}</p>
              <p className="text-[10px] text-muted-foreground">{t("referenceTime")}</p>
            </div>
          </div>
          <p className="text-lg font-mono font-bold text-primary tabular-nums">{egyptTime}</p>
        </div>

        {!queryEnabled || isLoading || isFetching ? (
          <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : isError ? (
          <p className="text-center text-xs text-destructive py-2">حدث خطأ في تحميل البيانات</p>
        ) : studentTimezones.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-2">{t("allStudentsEgyptTime")}</p>
        ) : (
          <div className="space-y-2">
            {studentTimezones.slice(0, 6).map(({ tz, count }) => {
              const offset = getTimezoneOffset(tz);
              const hasDST = isDSTActive(tz);
              const displayName = tzDisplayNames[tz] || tz.split("/").pop()?.replace(/_/g, " ") || tz;
              const time = currentTimes[tz] || "--:--";
              const offsetLabel = offset === 0 ? t("sameAsEgypt") : offset > 0 ? `+${offset} ${t("hours")}` : `${offset} ${t("hours")}`;

              return (
                <div key={tz} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <ArrowRightLeft className="h-2.5 w-2.5" />
                          {offsetLabel}
                        </span>
                        {hasDST && (
                          <span className="text-[9px] px-1 rounded bg-warning/15 text-warning font-medium">
                            DST
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          ({count} {count === 1 ? t("student") : t("studentsLabelTz")})
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-mono font-semibold tabular-nums shrink-0">{time}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TimezoneWidget.displayName = "TimezoneWidget";
export default TimezoneWidget;
