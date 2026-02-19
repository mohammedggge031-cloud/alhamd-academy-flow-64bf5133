import { Settings, Bell, Globe, Shield } from "lucide-react";
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

const SettingsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          الإعدادات
        </h1>
        <p className="text-muted-foreground">إعدادات النظام والأكاديمية</p>
      </div>

      {/* General */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            الإعدادات العامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>اسم الأكاديمية</Label>
            <Input defaultValue="أكاديمية الحمد لتحفيظ القرآن" />
          </div>
          <div className="grid gap-2">
            <Label>المنطقة الزمنية الافتراضية</Label>
            <Select defaultValue="Africa/Cairo">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Cairo">القاهرة (UTC+2)</SelectItem>
                <SelectItem value="Asia/Riyadh">الرياض (UTC+3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>العملة الافتراضية</Label>
            <Select defaultValue="USD">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">دولار أمريكي ($)</SelectItem>
                <SelectItem value="EGP">جنيه مصري (ج.م)</SelectItem>
                <SelectItem value="SAR">ريال سعودي (ر.س)</SelectItem>
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
            الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تذكير الحصص عبر الواتساب</Label>
            <Switch defaultChecked />
          </div>
          <div className="grid gap-2">
            <Label>إرسال التذكير قبل الحصة بـ</Label>
            <Select defaultValue="60">
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 دقيقة</SelectItem>
                <SelectItem value="60">ساعة</SelectItem>
                <SelectItem value="120">ساعتين</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>تذكير الفواتير المستحقة</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label>تنبيه الرصيد المنخفض</Label>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            الأمان
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تسجيل العمليات الحساسة (Audit Log)</Label>
            <Switch defaultChecked />
          </div>
          <Button variant="outline">تغيير كلمة المرور</Button>
        </CardContent>
      </Card>

      <Button className="w-full">حفظ الإعدادات</Button>
    </div>
  );
};

export default SettingsPage;
