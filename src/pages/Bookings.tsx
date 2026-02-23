import { useState, useEffect } from "react";
import { CalendarPlus, Eye, Phone, Mail, Globe, BookOpen, Clock, MessageSquare, CheckCircle2, XCircle, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface Booking {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  course_interest: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  timezone: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  is_read: boolean;
  created_at: string;
}

const Bookings = () => {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("trial_bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setBookings(data as Booking[]);
      setUnreadCount(data.filter((b: any) => !b.is_read).length);
    }
    if (error) console.error(error);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();

    // Realtime subscription for new bookings
    const channel = supabase
      .channel("trial_bookings_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trial_bookings" },
        (payload) => {
          const newBooking = payload.new as Booking;
          setBookings((prev) => [newBooking, ...prev]);
          setUnreadCount((prev) => prev + 1);
          toast({
            title: `🔔 ${t("newTrialBooking")}`,
            description: `${newBooking.full_name} - ${newBooking.course_interest || ""}`,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const openBooking = async (booking: Booking) => {
    setSelected(booking);
    setAdminNotes(booking.admin_notes || "");
    if (!booking.is_read) {
      await supabase.from("trial_bookings").update({ is_read: true }).eq("id", booking.id);
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, is_read: true } : b))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("trial_bookings").update({ status, admin_notes: adminNotes }).eq("id", id);
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status, admin_notes: adminNotes } : b))
    );
    setSelected(null);
    toast({ title: t("success"), description: t("statusUpdated") });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "new": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "contacted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "converted": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filtered = bookings.filter((b) => {
    const matchSearch =
      b.full_name.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search) ||
      (b.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarPlus className="h-6 w-6 text-primary" />
            {t("bookingsTitle")}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                <Bell className="h-3 w-3 mr-1" /> {unreadCount} {t("newLabel")}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">{t("bookingsSubtitle")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("bookingNew"), count: bookings.filter((b) => b.status === "new").length, color: "text-blue-600" },
          { label: t("bookingContacted"), count: bookings.filter((b) => b.status === "contacted").length, color: "text-yellow-600" },
          { label: t("bookingConverted"), count: bookings.filter((b) => b.status === "converted").length, color: "text-green-600" },
          { label: t("bookingCancelled"), count: bookings.filter((b) => b.status === "cancelled").length, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder={t("searchBookings")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="new">{t("bookingNew")}</SelectItem>
            <SelectItem value="contacted">{t("bookingContacted")}</SelectItem>
            <SelectItem value="converted">{t("bookingConverted")}</SelectItem>
            <SelectItem value="cancelled">{t("bookingCancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-muted-foreground">{t("loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">{t("noBookings")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>{t("fullName")}</TableHead>
                  <TableHead>{t("bookingCourse")}</TableHead>
                  <TableHead>{t("bookingPhone")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id} className={!b.is_read ? "bg-primary/5 font-medium" : ""}>
                    <TableCell>
                      {!b.is_read && <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </TableCell>
                    <TableCell>{b.full_name}</TableCell>
                    <TableCell>{b.course_interest || "-"}</TableCell>
                    <TableCell dir="ltr">{b.phone}</TableCell>
                    <TableCell className="text-xs">
                      {formatDate(b.created_at)}<br />
                      <span className="text-muted-foreground">{formatTime(b.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(b.status)}>{t(`booking${b.status.charAt(0).toUpperCase() + b.status.slice(1)}` as any)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openBooking(b)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              {t("bookingDetails")}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t("fullName")}:</span>
                  <span>{selected.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}`} target="_blank" className="text-primary hover:underline" dir="ltr">
                    {selected.phone}
                  </a>
                </div>
                {selected.email && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a>
                  </div>
                )}
                {selected.course_interest && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.course_interest}</span>
                  </div>
                )}
                {selected.preferred_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.preferred_date} {selected.preferred_time || ""}</span>
                  </div>
                )}
                {selected.timezone && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.timezone}</span>
                  </div>
                )}
              </div>

              {selected.message && (
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-1 text-sm font-medium mb-1">
                    <MessageSquare className="h-4 w-4" /> {t("bookingMessage")}
                  </div>
                  <p className="text-sm">{selected.message}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("bookingAdminNotes")}</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("bookingNotesPlaceholder")}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus(selected.id, "contacted")}>
                  <Phone className="h-3 w-3" /> {t("bookingContacted")}
                </Button>
                <Button size="sm" variant="default" className="gap-1" onClick={() => updateStatus(selected.id, "converted")}>
                  <CheckCircle2 className="h-3 w-3" /> {t("bookingConverted")}
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateStatus(selected.id, "cancelled")}>
                  <XCircle className="h-3 w-3" /> {t("bookingCancelled")}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {t("bookingReceivedAt")}: {formatDate(selected.created_at)} - {formatTime(selected.created_at)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bookings;
