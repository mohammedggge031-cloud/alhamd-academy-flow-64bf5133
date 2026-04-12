import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";

const SIGNATURE_SVG = `<svg width="120" height="45" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg"><path d="M40 90 Q120 20 200 80 Q260 120 320 60 T380 70" fill="none" stroke="#0B3D91" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

interface AdminSignatureToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

export const AdminSignatureToggle = ({ enabled, onToggle }: AdminSignatureToggleProps) => {
  const { role } = useAuth();
  const { lang } = useLanguage();
  if (role !== "admin") return null;
  return (
    <div className="flex items-center gap-2">
      <Switch checked={enabled} onCheckedChange={onToggle} />
      <Label className="text-xs cursor-pointer">
        {lang === "ar" ? "التوقيع الرسمي" : "Official Signature"}
      </Label>
    </div>
  );
};

interface AdminSignatureDisplayProps {
  enabled: boolean;
  className?: string;
}

export const AdminSignatureDisplay = ({ enabled, className }: AdminSignatureDisplayProps) => {
  if (!enabled) return null;
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div dangerouslySetInnerHTML={{ __html: SIGNATURE_SVG }} />
      <p style={{ fontSize: 10, color: "#666", fontFamily: "'Amiri', serif" }}>إدارة الأكاديمية</p>
    </div>
  );
};

export { SIGNATURE_SVG };
