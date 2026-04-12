import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSignaturePermission } from "@/hooks/useSignaturePermission";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import signatureImg from "@/assets/sig-mark-2.png";

/** Toggle for admin to enable/disable signature for self + manage managers */
export const AdminSignatureToggle = () => {
  const { lang } = useLanguage();
  const {
    isAdmin, isManager, myEnabled, canUseSignature,
    managerStatuses, toggleMy, toggleManager,
  } = useSignaturePermission();

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      <Switch checked={myEnabled} onCheckedChange={toggleMy} />
      <Label className="text-xs cursor-pointer">
        {lang === "ar" ? "التوقيع الرسمي" : "Official Signature"}
      </Label>

      {managerStatuses.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <p className="text-xs font-semibold mb-2">
              {lang === "ar" ? "صلاحية التوقيع للمشرفين" : "Manager Signature Access"}
            </p>
            <div className="space-y-2">
              {managerStatuses.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2">
                  <span className="text-xs truncate">{m.name}</span>
                  <Switch
                    checked={m.enabled}
                    onCheckedChange={(v) => toggleManager(m.userId, v)}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

interface AdminSignatureDisplayProps {
  className?: string;
}

/** Shows signature only if user has permission */
export const AdminSignatureDisplay = ({ className }: AdminSignatureDisplayProps) => {
  const { canUseSignature } = useSignaturePermission();
  if (!canUseSignature) return null;
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <img src={signatureImg} alt="Official Signature" width={160} height={60} style={{ objectFit: "contain" }} />
      <p style={{ fontSize: 10, color: "#666", fontFamily: "'Amiri', serif" }}>إدارة الأكاديمية</p>
    </div>
  );
};

/** For external use (e.g. PDF/report generation) */
export const SIGNATURE_IMAGE_URL = signatureImg;
