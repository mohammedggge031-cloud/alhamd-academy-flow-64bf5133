import { useState } from "react";
import { Receipt, Filter, Plus, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Invoice {
  id: string;
  students: string[];
  amount: number;
  discount: number;
  finalAmount: number;
  status: "paid" | "pending" | "overdue";
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  hours: number;
}

const mockInvoices: Invoice[] = [
  { id: "INV-001", students: ["أحمد محمد"], amount: 200, discount: 0, finalAmount: 200, status: "paid", issueDate: "2026-01-15", dueDate: "2026-02-15", paidDate: "2026-02-14", hours: 20 },
  { id: "INV-002", students: ["فاطمة علي"], amount: 160, discount: 0, finalAmount: 160, status: "pending", issueDate: "2026-01-20", dueDate: "2026-02-20", hours: 16 },
  { id: "INV-003", students: ["يوسف إبراهيم"], amount: 120, discount: 0, finalAmount: 120, status: "overdue", issueDate: "2026-01-10", dueDate: "2026-02-10", hours: 12 },
  { id: "INV-004", students: ["مريم حسن", "نور حسن"], amount: 400, discount: 10, finalAmount: 360, status: "paid", issueDate: "2026-02-01", dueDate: "2026-03-01", paidDate: "2026-02-01", hours: 40 },
  { id: "INV-005", students: ["عمر خالد"], amount: 120, discount: 0, finalAmount: 120, status: "pending", issueDate: "2026-02-05", dueDate: "2026-03-05", hours: 12 },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "مدفوعة", className: "bg-success text-success-foreground" },
  pending: { label: "معلقة", className: "bg-warning text-warning-foreground" },
  overdue: { label: "متأخرة", className: "bg-destructive text-destructive-foreground" },
};

const Invoices = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = statusFilter === "all"
    ? mockInvoices
    : mockInvoices.filter((i) => i.status === statusFilter);

  const totalPaid = mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.finalAmount, 0);
  const totalPending = mockInvoices.filter(i => i.status === "pending").reduce((s, i) => s + i.finalAmount, 0);
  const totalOverdue = mockInvoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.finalAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            إدارة الفواتير
          </h1>
          <p className="text-muted-foreground">{mockInvoices.length} فاتورة</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />إنشاء فاتورة</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>الطالب/الطلاب</Label>
                <Input placeholder="اختر طالب أو أكثر" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>عدد الساعات</Label>
                  <Input type="number" placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>المبلغ ($)</Label>
                  <Input type="number" placeholder="0" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>نسبة الخصم (%)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>تاريخ الاستحقاق</Label>
                <Input type="date" />
              </div>
              <Button onClick={() => setDialogOpen(false)}>إنشاء الفاتورة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">مدفوعة</p>
              <p className="text-xl font-bold text-success">${totalPaid}</p>
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success">
              {mockInvoices.filter(i => i.status === "paid").length}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">معلقة</p>
              <p className="text-xl font-bold text-warning">${totalPending}</p>
            </div>
            <Badge variant="secondary" className="bg-warning/10 text-warning">
              {mockInvoices.filter(i => i.status === "pending").length}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">متأخرة</p>
              <p className="text-xl font-bold text-destructive">${totalOverdue}</p>
            </div>
            <Badge variant="secondary" className="bg-destructive/10 text-destructive">
              {mockInvoices.filter(i => i.status === "overdue").length}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="paid">مدفوعة</SelectItem>
            <SelectItem value="pending">معلقة</SelectItem>
            <SelectItem value="overdue">متأخرة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices list */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{invoice.id}</p>
                      {invoice.discount > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-accent text-accent-foreground">
                          خصم {invoice.discount}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {invoice.students.join("، ")} · {invoice.hours} ساعة
                    </p>
                    <p className="text-xs text-muted-foreground">
                      استحقاق: {invoice.dueDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div>
                    <p className="text-sm font-bold">${invoice.finalAmount}</p>
                    {invoice.discount > 0 && (
                      <p className="text-xs text-muted-foreground line-through">${invoice.amount}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={statusConfig[invoice.status].className}>
                    {statusConfig[invoice.status].label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
