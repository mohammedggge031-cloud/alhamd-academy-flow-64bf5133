import { useState } from "react";
import { Settings, Bell, Globe, Shield, Languages, UserPlus, Trash2, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { t, lang, setLang } = useLanguage();
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [managerDialog, setManagerDialog] = useState(false);
  const [managerForm, setManagerForm] = useState({ name: "", email: "", password: "", dot_color: "#3B82F6" });

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

  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ["managers"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("manage-managers", {
        body: { action: "list" },
      });
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
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: t("success"), description: t("managerAdded") });
      setManagerDialog(false);
      setManagerForm({ name: "", email: "", password: "" });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const deleteManager = useMutation({
    mutationFn: async (userId: string) => {
      const res = await supabase.functions.invoke("manage-managers", {
        body: { action: "delete", manager_user_id: userId },
      });
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
            <Button variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
              {t("english")}
            </Button>
            <Button variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>
              {t("arabic")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manager Management - Admin Only */}
      {role === "admin" && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                {t("managerManagement")}
              </div>
              <Dialog open={managerDialog} onOpenChange={setManagerDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t("addManager")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("addManager")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>{t("managerName")}</Label>
                      <Input
                        value={managerForm.name}
                        onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
                        placeholder="مشرف جديد"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("managerEmail")}</Label>
                      <Input
                        type="email"
                        value={managerForm.email}
                        onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })}
                        placeholder="manager@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("managerPassword")}</Label>
                      <Input
                        type="password"
                        value={managerForm.password}
                        onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addManager.mutate()}
                      disabled={addManager.isPending || !managerForm.name || !managerForm.email || !managerForm.password}
                    >
                      {addManager.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("addManager")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{t("managerManagementDesc")}</p>
            {loadingManagers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : managers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noManagers")}</p>
            ) : (
              <div className="space-y-3">
                {managers.map((m: any) => (
                  <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(t("confirmDeleteManager"))) {
                          deleteManager.mutate(m.user_id);
                        }
                      }}
                      disabled={deleteManager.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* General */}
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
            <Input defaultValue="Alhamd Academy" />
          </div>
          <div className="grid gap-2">
            <Label>{t("defaultTimezone")}</Label>
            <Select defaultValue="Africa/Cairo">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Cairo">{t("cairo")}</SelectItem>
                <SelectItem value="Asia/Riyadh">{t("riyadh")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("defaultCurrency")}</Label>
            <Select defaultValue="USD">
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

      {/* Notifications */}
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
            <Switch defaultChecked />
          </div>
          <div className="grid gap-2">
            <Label>{t("reminderBefore")}</Label>
            <Select defaultValue="60">
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
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("lowBalanceAlert")}</Label>
            <Switch defaultChecked />
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
          <div className="flex items-center justify-between">
            <Label>{t("auditLog")}</Label>
            <Switch defaultChecked />
          </div>
          <Button variant="outline">{t("changePassword")}</Button>
        </CardContent>
      </Card>

      <Button className="w-full">{t("saveSettings")}</Button>
    </div>
  );
};

export default SettingsPage;
