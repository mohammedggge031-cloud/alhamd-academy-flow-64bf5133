import { useState, useMemo } from "react";
import { Receipt, Filter, Plus, CalendarDays, AlertTriangle, Loader2, MessageCircle, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { openWhatsApp, buildInvoiceMessage, buildPaidInvoiceMessage } from "@/utils/whatsappLinks";

const Invoices = () => {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [discount, setDiscount] = useState("0");
  const [dueDate, setDueDate] = useState("");

  const statusConfig: Record<string, { label: string; className: string }> = {
    paid: { label: t("paid"), className: "bg-success text-success-foreground" },
    pending: { label: t("pending"), className: "bg-warning text-warning-foreground" },
    overdue: { label: t("overdue"), className: "bg-destructive text-destructive-foreground" },
  };

  const { data: allStudents = [] } = useQuery({
    queryKey: ["students-for-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, name").eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, students:student_id(name, whatsapp, guardian_whatsapp), invoice_students(student_id, hours, amount, students:student_id(name, whatsapp, guardian_whatsapp))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayDue = useMemo(() =>
    invoices.filter((i: any) => i.due_date === todayStr && i.status !== "paid"),
    [invoices, todayStr]
  );

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "all") list = list.filter((i: any) => i.status === statusFilter);
    if (dateFrom) list = list.filter((i: any) => i.created_at >= dateFrom);
    if (dateTo) list = list.filter((i: any) => i.created_at <= dateTo + "T23:59:59");
    return list;
  }, [invoices, statusFilter, dateFrom, dateTo]);

  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total), 0);
  const totalPending = invoices.filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + Number(i.total), 0);
  const totalOverdue = invoices.filter((i: any) => i.status === "overdue").reduce((s: number, i: any) => s + Number(i.total), 0);

  const finalAmount = useMemo(() => {
    const a = parseFloat(amount) || 0;
    const d = parseFloat(discount) || 0;
    return a - (a * d / 100);
  }, [amount, discount]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (selectedStudents.length === 0) throw new Error(t("mustSelectStudent"));
      const amountNum = parseFloat(amount) || 0;
      const discountNum = parseFloat(discount) || 0;
      const hoursNum = parseFloat(hours) || 0;

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert([{
          student_id: selectedStudents.length === 1 ? selectedStudents[0] : null,
          amount: amountNum, discount: discountNum, total: finalAmount,
          hours: hoursNum, due_date: dueDate || null, status: "pending",
        }])
        .select().single();
      if (error) throw error;

      if (selectedStudents.length > 0 && invoice) {
        const perStudentHours = hoursNum / selectedStudents.length;
        const perStudentAmount = amountNum / selectedStudents.length;
        const entries = selectedStudents.map((sid) => ({
          invoice_id: invoice.id, student_id: sid,
          hours: perStudentHours, amount: perStudentAmount,
        }));
        await supabase.from("invoice_students").insert(entries);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setDialogOpen(false); setSelectedStudents([]); setAmount(""); setHours(""); setDiscount("0"); setDueDate("");
      toast({ title: t("invoiceCreated") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const markPaid = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoiceId);
      if (error) throw error;

      const inv = invoices.find((i: any) => i.id === invoiceId);
      if (inv) {
        const studentIds: string[] = [];
        if (inv.student_id) studentIds.push(inv.student_id);
        const invStudents = (inv as any).invoice_students || [];
        for (const is2 of invStudents) {
          if (is2.student_id && !studentIds.includes(is2.student_id)) studentIds.push(is2.student_id);
        }
        const totalHours = Number(inv.hours) || 0;
        const perStudent = totalHours / (studentIds.length || 1);
        for (const sid of studentIds) {
          const { data: student } = await supabase.from("students").select("remaining_hours, paid_hours").eq("id", sid).single();
          if (student) {
            await supabase.from("students").update({
              remaining_hours: (Number(student.remaining_hours) || 0) + perStudent,
              paid_hours: (Number(student.paid_hours) || 0) + perStudent,
            }).eq("id", sid);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: t("paymentRecorded") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const getStudentNames = (invoice: any): string => {
    const names: string[] = [];
    if (invoice.students?.name) names.push(invoice.students.name);
    if (invoice.invoice_students?.length) {
      for (const is2 of invoice.invoice_students) {
        const n = is2.students?.name;
        if (n && !names.includes(n)) names.push(n);
      }
    }
    return names.length > 0 ? names.join("، ") : "—";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            {t("invoicesTitle")}
          </h1>
          <p className="text-muted-foreground">{invoices.length} {t("invoicesCount")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />{t("createInvoice")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("createInvoiceTitle")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("selectStudents")}</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                  {allStudents.map((s: any) => (
                    <Badge key={s.id} variant={selectedStudents.includes(s.id) ? "default" : "outline"}
                      className="cursor-pointer select-none" onClick={() => toggleStudent(s.id)}>
                      {s.name}
                    </Badge>
                  ))}
                </div>
                {selectedStudents.length > 1 && (
                  <p className="text-xs text-muted-foreground">{t("mergedInvoice")} {selectedStudents.length} {t("studentsLabel2")}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("hoursCount")}</Label>
                  <Input type="number" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("amount")}</Label>
                  <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("discountPercent")}</Label>
                  <Input type="number" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("dueDate")}</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} dir="ltr" />
                </div>
              </div>
              {parseFloat(discount) > 0 && (
                <div className="rounded-lg bg-accent/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{t("afterDiscount")}</p>
                  <p className="text-xl font-bold text-primary">${finalAmount.toFixed(2)}</p>
                </div>
              )}
              <Button onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending}>
                {createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                {t("createInvoice")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {todayDue.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-warning font-medium text-sm mb-2">
              <AlertTriangle className="h-4 w-4" />
              {t("todayDueAlert")} ({todayDue.length})
            </div>
            {todayDue.map((inv: any) => (
              <p key={inv.id} className="text-xs text-muted-foreground">
                {getStudentNames(inv)} — ${inv.total}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("paid")}</p>
              <p className="text-xl font-bold text-success">${totalPaid}</p>
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success">
              {invoices.filter((i: any) => i.status === "paid").length}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("pending")}</p>
              <p className="text-xl font-bold text-warning">${totalPending}</p>
            </div>
            <Badge variant="secondary" className="bg-warning/10 text-warning">
              {invoices.filter((i: any) => i.status === "pending").length}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("overdue")}</p>
              <p className="text-xl font-bold text-destructive">${totalOverdue}</p>
            </div>
            <Badge variant="secondary" className="bg-destructive/10 text-destructive">
              {invoices.filter((i: any) => i.status === "overdue").length}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="paid">{t("paid")}</SelectItem>
            <SelectItem value="pending">{t("pending")}</SelectItem>
            <SelectItem value="overdue">{t("overdue")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" dir="ltr" />
          <span className="text-xs text-muted-foreground">{t("to")}</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" dir="ltr" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("noData")}</p>
              ) : filtered.map((invoice: any) => {
                const status = statusConfig[invoice.status] || statusConfig.pending;
                const discountPct = Number(invoice.discount) || 0;
                return (
                  <div key={invoice.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{getStudentNames(invoice)}</p>
                          {discountPct > 0 && (
                            <Badge variant="secondary" className="text-[10px] bg-accent text-accent-foreground">
                              {t("discount")} {discountPct}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {invoice.hours ? `${invoice.hours} ${t("hours")} · ` : ""}
                          {t("dueDateLabel")} {invoice.due_date || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <p className="text-sm font-bold">${invoice.total}</p>
                        {discountPct > 0 && (
                          <p className="text-xs text-muted-foreground line-through">${invoice.amount}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className={status.className}>
                        {status.label}
                      </Badge>
                      {invoice.status !== "paid" ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-success/30 text-success hover:bg-success hover:text-success-foreground"
                            onClick={() => markPaid.mutate(invoice.id)} disabled={markPaid.isPending}>
                            <Check className="h-3 w-3" />{t("markPaid")}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
                            title={t("sendInvoiceWhatsapp")}
                            onClick={() => {
                              const studentName = getStudentNames(invoice);
                              const phone = invoice.students?.whatsapp || invoice.students?.guardian_whatsapp
                                || invoice.invoice_students?.[0]?.students?.whatsapp
                                || invoice.invoice_students?.[0]?.students?.guardian_whatsapp || "";
                              if (!phone) {
                                toast({ title: t("error"), description: "لا يوجد رقم واتساب", variant: "destructive" });
                                return;
                              }
                              openWhatsApp(phone, buildInvoiceMessage(studentName, invoice.total, invoice.hours, invoice.due_date));
                            }}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
                          title={t("sendPaidConfirmation")}
                          onClick={() => {
                            const studentName = getStudentNames(invoice);
                            const phone = invoice.students?.whatsapp || invoice.students?.guardian_whatsapp
                              || invoice.invoice_students?.[0]?.students?.whatsapp
                              || invoice.invoice_students?.[0]?.students?.guardian_whatsapp || "";
                            if (!phone) {
                              toast({ title: t("error"), description: "لا يوجد رقم واتساب", variant: "destructive" });
                              return;
                            }
                            const paidDate = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("ar-EG") : new Date().toLocaleDateString("ar-EG");
                            openWhatsApp(phone, buildPaidInvoiceMessage(studentName, invoice.total, invoice.hours, paidDate));
                          }}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Invoices;
