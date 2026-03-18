import { useState, useEffect } from "react";
import { Bell, Check, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { openWhatsApp } from "@/utils/whatsappLinks";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

const NotificationPanel = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Notification[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleWhatsAppClick = (n: Notification) => {
    const meta = n.metadata || {};
    if (meta.whatsapp_phone && meta.whatsapp_message) {
      openWhatsApp(meta.whatsapp_phone, meta.whatsapp_message);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return `${mins} ${t("minutesAgo")}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${t("hoursAgo")}`;
    const days = Math.floor(hrs / 24);
    return `${days} ${t("daysAgo")}`;
  };

  const typeIcons: Record<string, string> = {
    session_reminder_6h: "⏰",
    session_reminder_5m: "🔔",
    monthly_report: "📋",
    homework: "📚",
    invoice: "💳",
    admin_alert: "⚠️",
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 end-0 z-50 w-80 sm:w-96 bg-card border rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
              <h3 className="text-sm font-bold">{t("notifications")}</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                    <Check className="h-3 w-3 ml-1" />
                    {t("markAllRead")}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[400px]">
              {notifications.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">{t("noNotifications")}</p>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 hover:bg-muted/30 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg shrink-0">{typeIcons[n.type] || "📌"}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? "font-bold" : "font-medium"}`}>{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {n.metadata?.whatsapp_phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
                              onClick={() => handleWhatsAppClick(n)}
                              title={n.metadata?.whatsapp_label || "WhatsApp"}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Second WhatsApp button if exists */}
                          {n.metadata?.whatsapp_phone_2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#128C7E] hover:text-[#128C7E] hover:bg-[#128C7E]/10"
                              onClick={() => openWhatsApp(n.metadata.whatsapp_phone_2, n.metadata.whatsapp_message_2)}
                              title={n.metadata?.whatsapp_label_2 || "WhatsApp"}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {!n.is_read && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead(n.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationPanel;
