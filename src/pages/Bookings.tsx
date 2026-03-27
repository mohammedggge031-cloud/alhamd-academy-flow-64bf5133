import { useState } from "react";
import { CalendarPlus, Eye, Phone, Mail, Globe, BookOpen, Clock, MessageSquare, CheckCircle2, XCircle, Bell, CreditCard, Loader2, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmDialog from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "@/components/PaginationControls";
import { useEffect } from "react";

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

interface SubscriptionRequest {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  plan_name: string;
  plan_price: string | null;
  sessions_per_week: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  is_read: boolean;
  created_at: string;
}

const Bookings = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubscriptionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ type: "cancelled" | "selected"; tab: "bookings" | "subscriptions" } | null>(null);

  const toggleBookingSelect = (id: string) => {
    setSelectedBookingIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSubSelect = (id: string) => {
    setSelectedSubIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const [activeTab, setActiveTab] = useState("bookings");

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trial_bookings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SubscriptionRequest[];
    },
  });

  const loading = loadingBookings || loadingSubs;

  // Realtime subscriptions
  useEffect(() => {
    const bookingChannel = supabase
      .channel("trial_bookings_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trial_bookings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        queryClient.invalidateQueries({ queryKey: ["sidebar-unread"] });
      })
      .subscribe();

    const subChannel = supabase
      .channel("subscription_requests_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "subscription_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["sidebar-unread"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(subChannel);
    };
  }, [queryClient]);

  const unreadBookings = bookings.filter(b => !b.is_read).length;
  const unreadSubs = subscriptions.filter(s => !s.is_read).length;
  const totalUnread = unreadBookings + unreadSubs;

  const markBookingRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("trial_bookings").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-unread"] });
    },
  });

  const markSubRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("subscription_requests").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-unread"] });
    },
  });

  const updateBookingStatusMut = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase.from("trial_bookings").update({ status, admin_notes: notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setSelected(null);
      toast({ title: t("success"), description: t("statusUpdated") });
    },
  });

  const updateSubStatusMut = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase.from("subscription_requests").update({ status, admin_notes: notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setSelectedSub(null);
      toast({ title: t("success"), description: t("statusUpdated") });
    },
  });

  const openBooking = (booking: Booking) => {
    setSelected(booking);
    setAdminNotes(booking.admin_notes || "");
    if (!booking.is_read) markBookingRead.mutate(booking.id);
  };

  const openSub = (sub: SubscriptionRequest) => {
    setSelectedSub(sub);
    setAdminNotes(sub.admin_notes || "");
    if (!sub.is_read) markSubRead.mutate(sub.id);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "new": return "bg-primary/10 text-primary";
      case "contacted": return "bg-warning/10 text-warning";
      case "converted": return "bg-success/10 text-success";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { new: t("bookingNew"), contacted: t("bookingContacted"), converted: t("bookingConverted"), cancelled: t("bookingCancelled") };
    return map[s] || s;
  };

  const filteredBookings = bookings.filter((b) => {
    const matchSearch = b.full_name.toLowerCase().includes(search.toLowerCase()) || b.phone.includes(search) || (b.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredSubs = subscriptions.filter((s) => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search) || (s.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const bookingsPagination = usePagination(filteredBookings, { pageSize: 50 });
  const subsPagination = usePagination(filteredSubs, { pageSize: 50 });

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarPlus className="h-6 w-6 text-primary" />
            {t("bookingsTitle")}
            {totalUnread > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                <Bell className="h-3 w-3 mr-1" /> {totalUnread} {t("newLabel")}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">{t("bookingsSubtitle")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("bookingNew"), count: bookings.filter((b) => b.status === "new").length + subscriptions.filter((s) => s.status === "new").length, color: "text-primary" },
          { label: t("bookingContacted"), count: bookings.filter((b) => b.status === "contacted").length + subscriptions.filter((s) => s.status === "contacted").length, color: "text-warning" },
          { label: t("bookingConverted"), count: bookings.filter((b) => b.status === "converted").length + subscriptions.filter((s) => s.status === "converted").length, color: "text-success" },
          { label: t("bookingCancelled"), count: bookings.filter((b) => b.status === "cancelled").length + subscriptions.filter((s) => s.status === "cancelled").length, color: "text-destructive" },
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
        <Input placeholder={t("searchBookings")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bookings" className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            {t("bookingsTrialTab")}
            {unreadBookings > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1">{unreadBookings}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="h-4 w-4" />
            {t("bookingsSubsTab")}
            {unreadSubs > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1">{unreadSubs}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredBookings.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">{t("noBookings")}</p>
              ) : (
                <>
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
                      {bookingsPagination.paginatedItems.map((b) => (
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
                            <Badge className={statusColor(b.status)}>{statusLabel(b.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`https://wa.me/${b.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-success hover:text-success">
                                  <Phone className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openBooking(b)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls page={bookingsPagination.page} totalPages={bookingsPagination.totalPages} totalItems={bookingsPagination.totalItems} onPageChange={bookingsPagination.setPage} hasNext={bookingsPagination.hasNext} hasPrev={bookingsPagination.hasPrev} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredSubs.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">{t("bookingsNoSubs")}</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>{t("fullName")}</TableHead>
                        <TableHead>{t("bookingsPlan")}</TableHead>
                        <TableHead>{t("bookingsPrice")}</TableHead>
                        <TableHead>{t("bookingPhone")}</TableHead>
                        <TableHead>{t("date")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subsPagination.paginatedItems.map((s) => (
                        <TableRow key={s.id} className={!s.is_read ? "bg-primary/5 font-medium" : ""}>
                          <TableCell>
                            {!s.is_read && <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />}
                          </TableCell>
                          <TableCell>{s.full_name}</TableCell>
                          <TableCell>{s.plan_name}</TableCell>
                          <TableCell>{s.plan_price || "-"}</TableCell>
                          <TableCell dir="ltr">{s.phone}</TableCell>
                          <TableCell className="text-xs">
                            {formatDate(s.created_at)}<br />
                            <span className="text-muted-foreground">{formatTime(s.created_at)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColor(s.status)}>{statusLabel(s.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-success hover:text-success">
                                  <Phone className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openSub(s)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls page={subsPagination.page} totalPages={subsPagination.totalPages} totalItems={subsPagination.totalItems} onPageChange={subsPagination.setPage} hasNext={subsPagination.hasNext} hasPrev={subsPagination.hasPrev} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Detail Dialog */}
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
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder={t("bookingNotesPlaceholder")} rows={2} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => updateBookingStatusMut.mutate({ id: selected.id, status: "contacted", notes: adminNotes })} disabled={updateBookingStatusMut.isPending}>
                  <Phone className="h-3 w-3" /> {t("bookingContacted")}
                </Button>
                <Button size="sm" variant="default" className="gap-1" onClick={() => updateBookingStatusMut.mutate({ id: selected.id, status: "converted", notes: adminNotes })} disabled={updateBookingStatusMut.isPending}>
                  <CheckCircle2 className="h-3 w-3" /> {t("bookingConverted")}
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateBookingStatusMut.mutate({ id: selected.id, status: "cancelled", notes: adminNotes })} disabled={updateBookingStatusMut.isPending}>
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

      {/* Subscription Detail Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={() => setSelectedSub(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t("bookingsSubsTab")}
            </DialogTitle>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t("fullName")}:</span>
                  <span>{selectedSub.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`https://wa.me/${selectedSub.phone.replace(/[^0-9]/g, "")}`} target="_blank" className="text-primary hover:underline" dir="ltr">
                    {selectedSub.phone}
                  </a>
                </div>
                {selectedSub.email && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedSub.email}`} className="text-primary hover:underline">{selectedSub.email}</a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedSub.plan_name}</span>
                </div>
                {selectedSub.plan_price && (
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">{selectedSub.plan_price}</span>
                  </div>
                )}
                {selectedSub.sessions_per_week && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedSub.sessions_per_week} حصة/أسبوع</span>
                  </div>
                )}
              </div>
              {selectedSub.message && (
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-1 text-sm font-medium mb-1">
                    <MessageSquare className="h-4 w-4" /> {t("bookingMessage")}
                  </div>
                  <p className="text-sm">{selectedSub.message}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("bookingAdminNotes")}</label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder={t("bookingNotesPlaceholder")} rows={2} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => updateSubStatusMut.mutate({ id: selectedSub.id, status: "contacted", notes: adminNotes })} disabled={updateSubStatusMut.isPending}>
                  <Phone className="h-3 w-3" /> {t("bookingContacted")}
                </Button>
                <Button size="sm" variant="default" className="gap-1" onClick={() => updateSubStatusMut.mutate({ id: selectedSub.id, status: "converted", notes: adminNotes })} disabled={updateSubStatusMut.isPending}>
                  <CheckCircle2 className="h-3 w-3" /> {t("bookingConverted")}
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateSubStatusMut.mutate({ id: selectedSub.id, status: "cancelled", notes: adminNotes })} disabled={updateSubStatusMut.isPending}>
                  <XCircle className="h-3 w-3" /> {t("bookingCancelled")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("bookingReceivedAt")}: {formatDate(selectedSub.created_at)} - {formatTime(selectedSub.created_at)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bookings;
