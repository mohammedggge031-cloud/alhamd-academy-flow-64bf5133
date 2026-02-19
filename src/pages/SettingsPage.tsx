import { Settings, Bell, Globe, Shield, Languages } from "lucide-react";
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
import { useLanguage } from "@/i18n/LanguageContext";

const SettingsPage = () => {
  const { t, lang, setLang } = useLanguage();

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
