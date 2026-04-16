import { useState, useEffect, useCallback } from "react";
import { Settings, Bell, Globe, Shield, Languages, UserPlus, Trash2, Loader2, Users, Save, KeyRound, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

const SettingsPage = () => {
  const { t, lang, setLang } = useLanguage();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [managerDialog, setManagerDialog] = useState(false);
  const [deleteManagerId, setDeleteManagerId] = useState<string | null>(null);
  const [managerForm, setManagerForm] = useState({ name: "", email: "", password: "", dot_color: "#3B82F6", role: "manager" as "manager" | "admin", sheets_students: false, sheets_teachers: false });
  const [changePasswordForm, setChangePasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ userId: string; name: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  // Settings state
  const [settings, setSettings] = useState({
    academy_name: "Alhamd Academy",
    default_timezone: "Africa/Cairo",
    default_currency: "USD",
    whatsapp_reminder: "true",
    reminder_before_minutes: "60",
    due_invoice_reminder: "true",
    low_balance_alert: "true",
  });
  const [settingsDirty, setSettingsDirty] = useState(false);

  const dotColorOptions = [
    { color: "#3B82F6", label: "أزرق" },
    { color: "#EF4444", label: "أحمر" },
    { color: "#10B981", label: "أخضر" },
    { color: "#F59E0B", label: "برتقالي" },
    { color: "#8B5CF6", label: "بنفسجي" },
    { color: "#EC4899", label: "وردي" },
    { color: "#06B6D4", label: "سماوي" },
    { color: "#F97316", label: "نارنجي" },
  ];

  // Load settings from DB
  const { data: dbSettings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["academy-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("academy_settings").select("key, value");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (dbSettings.length > 0) {
      const newSettings = { ...settings };
      for (const s of dbSettings) {
        if (s.key in newSettings) {
          (newSettings as any)[s.key] = s.value ?? (newSettings as any)[s.key];
        }
      }
      setSettings(newSettings);
      setSettingsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbSettings]);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSettingsDirty(true);
  };

  const saveSettings = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(settings);
      for (const [key, value] of entries) {
        await supabase.from("academy_settings").upsert({ key, value }, { onConflict: "key" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-settings"] });
      setSettingsDirty(false);
      toast({ title: t("success"), description: t("settingsSaved") });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (changePasswordForm.new !== changePasswordForm.confirm) throw new Error(t("passwordMismatch"));
      if (changePasswordForm.new.length < 8) throw new Error(t("passwordTooShort"));
      const { error } = await supabase.auth.updateUser({ password: changePasswordForm.new });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("success"), description: t("passwordChanged") });
      setChangePasswordForm({ current: "", new: "", confirm: "" });
      setShowChangePassword(false);
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  // Manager management - now includes admins too
  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ["managers"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("manage-managers", { body: { action: "list" } });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.managers || [];
    },
    enabled: role === "admin",
  });

  const addManager = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("manage-managers", {
        body: {
          action: "create",
          email: managerForm.email,
          password: managerForm.password,
          full_name: managerForm.name,
          dot_color: managerForm.dot_color,
          role: managerForm.role,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      // Save sheets access if manager role
      if (res.data?.user_id && managerForm.role === "manager") {
        const sheets: string[] = [];
        if (managerForm.sheets_students) sheets.push("students");
        if (managerForm.sheets_teachers) sheets.push("teachers");
        await saveSheetsAccess(res.data.user_id, sheets);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["data-sheets-access"] });
      toast({ title: t("success"), description: t("managerAdded") });
      setManagerDialog(false);
      setManagerForm({ name: "", email: "", password: "", dot_color: "#3B82F6", role: "manager", sheets_students: false, sheets_teachers: false });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  // Data sheets access management
  const { data: sheetsAccessMap = {} } = useQuery({
    queryKey: ["data-sheets-access"],
    queryFn: async () => {
      const { data } = await supabase.from("academy_settings").select("value").eq("key", "data_sheets_access").maybeSingle();
      if (data?.value) {
        try { return JSON.parse(data.value); } catch { return {}; }
      }
      return {};
    },
    enabled: role === "admin",
  });

  const saveSheetsAccess = async (userId: string, sheets: string[]) => {
    const current = { ...sheetsAccessMap };
    if (sheets.length > 0) {
      current[userId] = sheets;
    } else {
      delete current[userId];
    }
    await supabase.from("academy_settings").upsert(
      { key: "data_sheets_access", value: JSON.stringify(current) },
      { onConflict: "key" }
    );
  };

  const toggleSheetsAccess = useMutation({
    mutationFn: async ({ userId, sheetType }: { userId: string; sheetType: string }) => {
      const current: Record<string, string[]> = { ...sheetsAccessMap };
      const userSheets = current[userId] || [];
      const newSheets = userSheets.includes(sheetType)
        ? userSheets.filter(s => s !== sheetType)
        : [...userSheets, sheetType];
      await saveSheetsAccess(userId, newSheets);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-sheets-access"] });
    },
  });

  const deleteManager = useMutation({
    mutationFn: async (userId: string) => {
      const res = await supabase.functions.invoke("manage-managers", { body: { action: "delete", manager_user_id: userId } });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: t("success"), description: t("managerDeleted") });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const updateColor = useMutation({
    mutationFn: async ({ userId, color }: { userId: string; color: string }) => {
      const res = await supabase.functions.invoke("manage-managers", { body: { action: "update_color", manager_user_id: userId, dot_color: color } });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: t("success") });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const res = await supabase.functions.invoke("manage-managers", {
        body: { action: "reset_password", target_user_id: userId, new_password: password },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      toast({ title: t("success"), description: t("passwordResetSuccess") });
      setResetPasswordDialog(null);
      setResetPasswordValue("");
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {t("settingsTitle")}
        </h1>
        <p className="text-muted-foreground">{t("settingsSubtitle")}</p>
      </div>

      {/* Language */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="h-5 w-5 text-primary" />
            {t("language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>{t("english")}</Button>
            <Button variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>{t("arabic")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Management - Admin Only */}
      {role === "admin" && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                {t("accountManagement")}
              </div>
              <Dialog open={managerDialog} onOpenChange={setManagerDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2"><UserPlus className="h-4 w-4" />{t("addAccount")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("addAccount")}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>{t("accountRole")}</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={managerForm.role === "manager" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setManagerForm({ ...managerForm, role: "manager" })}
                        >
                          {t("manager")}
                        </Button>
                        <Button
                          type="button"
                          variant={managerForm.role === "admin" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setManagerForm({ ...managerForm, role: "admin" })}
                        >
                          {t("admin")}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("managerName")}</Label>
                      <Input value={managerForm.name} onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })} placeholder="اسم الحساب" />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("managerEmail")}</Label>
                      <Input type="email" value={managerForm.email} onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })} placeholder="email@example.com" dir="ltr" />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("managerPassword")}</Label>
                      <Input type="password" value={managerForm.password} onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })} placeholder="••••••••" dir="ltr" />
                    </div>
                    <div className="grid gap-2">
                      <Label>لون التعريف</Label>
                      <div className="flex gap-2 flex-wrap">
                        {dotColorOptions.map((opt) => (
                          <button key={opt.color} type="button"
                            className={`h-7 w-7 rounded-full border-2 transition-transform ${managerForm.dot_color === opt.color ? "border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20" : "border-transparent"}`}
                            style={{ backgroundColor: opt.color }} onClick={() => setManagerForm({ ...managerForm, dot_color: opt.color })} title={opt.label} />
                        ))}
                      </div>
                    </div>
                    {managerForm.role === "manager" && (
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                          {lang === "ar" ? "صلاحية سجلات البيانات" : "Data Registries Access"}
                        </Label>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" className="rounded border-input" checked={managerForm.sheets_students}
                              onChange={(e) => setManagerForm({ ...managerForm, sheets_students: e.target.checked })} />
                            {lang === "ar" ? "سجل الطلاب" : "Students Registry"}
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" className="rounded border-input" checked={managerForm.sheets_teachers}
                              onChange={(e) => setManagerForm({ ...managerForm, sheets_teachers: e.target.checked })} />
                            {lang === "ar" ? "سجل المعلمين" : "Teachers Registry"}
                          </label>
                        </div>
                      </div>
                    )}
                    <Button className="w-full" onClick={() => addManager.mutate()} disabled={addManager.isPending || !managerForm.name || !managerForm.email || !managerForm.password}>
                      {addManager.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("addAccount")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{t("accountManagementDesc")}</p>
            {loadingManagers ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : managers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noManagers")}</p>
            ) : (
              <div className="space-y-3">
                {managers.map((m: any) => (
                  <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 rounded-full shrink-0 border border-border" style={{ backgroundColor: m.dot_color || "#999" }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{m.full_name}</p>
                          {m.is_primary ? (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">{t("primaryAdmin")}</Badge>
                          ) : m.role === "admin" ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t("coAdmin")}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t("manager")}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {dotColorOptions.map((opt) => (
                          <button key={opt.color} type="button"
                            className={`h-4 w-4 rounded-full transition-transform ${m.dot_color === opt.color ? "ring-2 ring-offset-1 ring-foreground/30 scale-110" : "opacity-50 hover:opacity-100"}`}
                            style={{ backgroundColor: opt.color }} onClick={() => updateColor.mutate({ userId: m.user_id, color: opt.color })} title={opt.label} />
                        ))}
                      </div>
                      {/* Reset password button - only primary admin can reset others */}
                      {user?.email?.toLowerCase() === "info@alhamdacademy.net" && !m.is_primary && (
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"
                          onClick={() => setResetPasswordDialog({ userId: m.user_id, name: m.full_name })} title={t("resetPassword")}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                      {!m.is_primary && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteManagerId(m.user_id)} disabled={deleteManager.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* General Settings - persisted */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            {t("generalSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>{t("academyNameLabel")}</Label>
            <Input value={settings.academy_name} onChange={(e) => updateSetting("academy_name", e.target.value)} disabled={role !== "admin"} />
          </div>
          <div className="grid gap-2">
            <Label>{t("defaultTimezone")}</Label>
            <Select value={settings.default_timezone} onValueChange={(v) => updateSetting("default_timezone", v)} disabled={role !== "admin"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Cairo">{t("cairo")}</SelectItem>
                <SelectItem value="Asia/Riyadh">{t("riyadh")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("defaultCurrency")}</Label>
            <Select value={settings.default_currency} onValueChange={(v) => updateSetting("default_currency", v)} disabled={role !== "admin"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">{t("usd")}</SelectItem>
                <SelectItem value="EGP">{t("egp")}</SelectItem>
                <SelectItem value="SAR">{t("sar")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications - persisted */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            {t("notifications")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("whatsappReminder")}</Label>
            <Switch checked={settings.whatsapp_reminder === "true"} onCheckedChange={(c) => updateSetting("whatsapp_reminder", c ? "true" : "false")} disabled={role !== "admin"} />
          </div>
          <div className="grid gap-2">
            <Label>{t("reminderBefore")}</Label>
            <Select value={settings.reminder_before_minutes} onValueChange={(v) => updateSetting("reminder_before_minutes", v)} disabled={role !== "admin"}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{t("thirtyMin")}</SelectItem>
                <SelectItem value="60">{t("oneHour")}</SelectItem>
                <SelectItem value="120">{t("twoHours")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("dueInvoiceReminder")}</Label>
            <Switch checked={settings.due_invoice_reminder === "true"} onCheckedChange={(c) => updateSetting("due_invoice_reminder", c ? "true" : "false")} disabled={role !== "admin"} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("lowBalanceAlert")}</Label>
            <Switch checked={settings.low_balance_alert === "true"} onCheckedChange={(c) => updateSetting("low_balance_alert", c ? "true" : "false")} disabled={role !== "admin"} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            {t("security")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showChangePassword ? (
            <Button variant="outline" onClick={() => setShowChangePassword(true)}>{t("changePassword")}</Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <div className="grid gap-2">
                <Label>{t("newPassword")}</Label>
                <Input type="password" dir="ltr" value={changePasswordForm.new} onChange={(e) => setChangePasswordForm(p => ({ ...p, new: e.target.value }))} placeholder="••••••••" />
              </div>
              <div className="grid gap-2">
                <Label>{t("confirmPassword")}</Label>
                <Input type="password" dir="ltr" value={changePasswordForm.confirm} onChange={(e) => setChangePasswordForm(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending || !changePasswordForm.new || !changePasswordForm.confirm}>
                  {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("changePassword")}
                </Button>
                <Button variant="ghost" onClick={() => { setShowChangePassword(false); setChangePasswordForm({ current: "", new: "", confirm: "" }); }}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {role === "admin" && (
        <Button className="w-full gap-2" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || !settingsDirty}>
          {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("saveSettings")}
        </Button>
      )}

      {/* Delete manager confirm dialog */}
      <ConfirmDialog
        open={!!deleteManagerId}
        onOpenChange={(open) => !open && setDeleteManagerId(null)}
        title={t("delete")}
        description={t("confirmDeleteManager")}
        confirmLabel={t("delete")}
        variant="destructive"
        onConfirm={() => {
          if (deleteManagerId) {
            deleteManager.mutate(deleteManagerId);
            setDeleteManagerId(null);
          }
        }}
        isPending={deleteManager.isPending}
      />

      {/* Reset password dialog */}
      <Dialog open={!!resetPasswordDialog} onOpenChange={(open) => { if (!open) { setResetPasswordDialog(null); setResetPasswordValue(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resetPasswordFor")} {resetPasswordDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>{t("newPassword")}</Label>
              <Input type="password" dir="ltr" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} placeholder="••••••••" />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (resetPasswordDialog) {
                  resetPasswordMutation.mutate({ userId: resetPasswordDialog.userId, password: resetPasswordValue });
                }
              }}
              disabled={resetPasswordMutation.isPending || resetPasswordValue.length < 8}
            >
              {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("resetPassword")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;