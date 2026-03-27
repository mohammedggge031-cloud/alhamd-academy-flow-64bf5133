import { useState } from "react";
import { DollarSign, Plus, Trash2, Loader2, Megaphone, UserCog, MoreHorizontal, Filter } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "@/components/PaginationControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

const Expenses = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [form, setForm] = useState({ category: "other", description: "", amount: "", expense_month: new Date().toISOString().slice(0, 7) });

  const categoryLabels: Record<string, { label: string; icon: any }> = {
    advertising: { label: t("advertising"), icon: Megaphone },
    admin_salary: { label: t("adminSalary"), icon: UserCog },
    other: { label: t("otherExpenses"), icon: MoreHorizontal },
  };

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("expense_month", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        category: form.category, description: form.description,
        amount: Number(form.amount), expense_month: form.expense_month + "-01",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("expenseAdded"));
      setOpen(false);
      setForm({ category: "other", description: "", amount: "", expense_month: new Date().toISOString().slice(0, 7) });
    },
    onError: () => toast.error(t("error")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("deleted"));
    },
  });

  const filteredExpenses = monthFilter === "all" ? expenses : expenses.filter(e => (e.expense_month as string)?.slice(0, 7) === monthFilter);

  const totalAds = filteredExpenses.filter(e => e.category === "advertising").reduce((s, e) => s + Number(e.amount), 0);
  const totalSalaries = filteredExpenses.filter(e => e.category === "admin_salary").reduce((s, e) => s + Number(e.amount), 0);
  const totalOther = filteredExpenses.filter(e => e.category === "other").reduce((s, e) => s + Number(e.amount), 0);
  const grandTotal = totalAds + totalSalaries + totalOther;

  const { page, setPage, totalPages, paginatedItems, totalItems, hasNext, hasPrev } = usePagination(filteredExpenses, { pageSize: 50 });

  const uniqueMonths = [...new Set(expenses.map(e => (e.expense_month as string)?.slice(0, 7)).filter(Boolean))].sort().reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            {t("expensesTitle")}
          </h1>
          <p className="text-muted-foreground">{t("expensesSubtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> {t("addExpense")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("addExpenseTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>{t("category")}</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertising">{t("advertising")}</SelectItem>
                    <SelectItem value="admin_salary">{t("adminSalary")}</SelectItem>
                    <SelectItem value="other">{t("otherExpenses")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("description")}</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{t("amount")}</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>{t("month")}</Label>
                <Input type="month" value={form.expense_month} onChange={e => setForm(f => ({ ...f, expense_month: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={() => addMutation.mutate()} disabled={!form.description || !form.amount || addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("add")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {uniqueMonths.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("advertising"), value: totalAds, color: "text-primary" },
          { label: t("adminSalary"), value: totalSalaries, color: "text-primary" },
          { label: t("otherExpenses"), value: totalOther, color: "text-primary" },
          { label: t("totalExpenses"), value: grandTotal, color: "text-destructive" },
        ].map(c => (
          <Card key={c.label} className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className={`text-2xl font-bold ${c.color}`}>${c.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-lg">{t("allExpenses")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredExpenses.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">{t("noExpenses")}</p>
          ) : (
            <>
              <div className="divide-y">
                {paginatedItems.map((exp: any) => {
                  const cat = categoryLabels[exp.category] ?? categoryLabels.other;
                  const Icon = cat.icon;
                  return (
                    <div key={exp.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{exp.description}</p>
                          <p className="text-xs text-muted-foreground">{cat.label} • {exp.expense_month?.slice(0, 7)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">${Number(exp.amount).toLocaleString()}</span>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(exp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} hasNext={hasNext} hasPrev={hasPrev} />
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("delete")}
        description={t("confirmDeleteExpense")}
        confirmLabel={t("delete")}
        variant="destructive"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default Expenses;
