import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { openWhatsApp } from "@/utils/whatsappLinks";
import { Loader2 } from "lucide-react";

interface Props {
  teacher: {
    id: string;
    hourly_rate: number;
    rate_currency?: string;
    monthly_hours?: number | null;
    monthly_waiting_minutes?: number | null;
    monthly_salary?: number | null;
    bonus_amount?: number | null;
    bonus_reason?: string | null;
    profiles?: { full_name: string; whatsapp: string | null } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TeacherSalaryDialog = ({ teacher, open, onOpenChange }: Props) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusReason, setBonusReason] = useState("");
  const [rate, setRate] = useState("");
  const [rateCurrency, setRateCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teacher && open) {
      setBonusAmount(String(teacher.bonus_amount || ""));
      setBonusReason(teacher.bonus_reason || "");
      setRate(String(teacher.hourly_rate));
      setRateCurrency((teacher as any).rate_currency || "USD");
    }
  }, [teacher, open]);

  if (!teacher) return null;

  const currencySymbol = rateCurrency === "EGP" ? "ج.م" : "$";
  const baseSalary = teacher.monthly_salary ?? 0;
  const bonus = bonusAmount ? parseFloat(bonusAmount) : 0;
  const totalSalary = baseSalary + bonus;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("teachers")
        .update({
          hourly_rate: parseFloat(rate) || teacher.hourly_rate,
          rate_currency: rateCurrency,
          bonus_amount: bonus,
          bonus_reason: bonus > 0 ? bonusReason : null,
        } as any)
        .eq("id", teacher.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({ title: t("success"), description: t("rateUpdated") });
    } catch (err: any) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = teacher.profiles?.whatsapp;
    if (!phone) return;
    const name = teacher.profiles?.full_name || "";
    const now = new Date();
    const monthName = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

    let msg = `💰 *كشف حساب المعلم - أكاديمية الحمد*\n\n`;
    msg += `السلام عليكم ورحمة الله وبركاته\n\n`;
    msg += `👨‍🏫 المعلم: ${name}\n`;
    msg += `📅 الشهر: ${monthName}\n\n`;
    msg += `⏱ ساعات العمل: ${teacher.monthly_hours ?? 0} ساعة\n`;
    msg += `⏳ دقائق الانتظار: ${teacher.monthly_waiting_minutes ?? 0} دقيقة\n`;
    msg += `💵 ريت الساعة: ${currencySymbol}${teacher.hourly_rate}\n`;
    msg += `💰 الراتب الأساسي: ${currencySymbol}${baseSalary}\n`;
    if (bonus > 0) {
      msg += `\n🎁 *مكافأة: ${currencySymbol}${bonus}*\n`;
      if (bonusReason) msg += `📝 السبب: ${bonusReason}\n`;
    }
    msg += `\n✅ *الإجمالي: ${currencySymbol}${totalSalary}*\n\n`;
    msg += `جزاك الله خيراً 🤲\n_أكاديمية الحمد لتحفيظ القرآن الكريم_`;

    openWhatsApp(phone, msg);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("salaryDetails")} - {teacher.profiles?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Rate editing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("hourlyRate")}</Label>
              <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} dir="ltr" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("currency")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={rateCurrency}
                onChange={(e) => setRateCurrency(e.target.value)}
              >
                <option value="USD">$ USD</option>
                <option value="EGP">ج.م EGP</option>
              </select>
            </div>
          </div>

          {/* Salary breakdown */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("workingHours")}:</span>
              <span className="font-medium">{teacher.monthly_hours ?? 0} {t("hours")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("waitingMinutes")}:</span>
              <span className="font-medium">{teacher.monthly_waiting_minutes ?? 0} {t("minutes")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("hourlyRate")}:</span>
              <span className="font-medium">{currencySymbol}{rate || teacher.hourly_rate}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">{t("salary")}:</span>
              <span className="font-bold">{currencySymbol}{baseSalary}</span>
            </div>
          </div>

          {/* Bonus section */}
          <div className="space-y-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("bonusAmount")}</Label>
              <Input
                type="number"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                placeholder="0"
                dir="ltr"
              />
            </div>
            {bonusAmount && parseFloat(bonusAmount) > 0 && (
              <div className="grid gap-1.5 animate-in fade-in slide-in-from-top-1">
                <Label className="text-xs">{t("bonusReason")}</Label>
                <Input
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  placeholder={t("bonusReason")}
                />
              </div>
            )}
          </div>

          {/* Total */}
          {bonus > 0 && (
            <div className="rounded-lg bg-primary/10 p-3 flex justify-between items-center animate-in fade-in">
              <span className="font-medium text-sm">{t("totalWithBonus")}:</span>
              <span className="text-lg font-bold text-primary">{currencySymbol}{totalSalary}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t("save")}
            </Button>
            <Button
              variant="outline"
              onClick={handleWhatsApp}
              disabled={!teacher.profiles?.whatsapp}
              className="gap-2"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {t("sendSalaryWhatsapp")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
