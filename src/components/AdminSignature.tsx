import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSignaturePermission } from "@/hooks/useSignaturePermission";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

const SIGNATURE_SVG = `<svg width="140" height="50" viewBox="0 0 500 180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ink" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="4" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g filter="url(#ink)" opacity="0.92">
    <path d="M45 120 C55 118 62 105 70 95 C82 78 90 62 105 52 C115 45 125 48 130 58 C138 72 132 90 125 105 C120 115 112 122 108 118 C104 112 110 95 120 80 C130 65 145 55 160 50 C175 45 185 52 188 65 C192 80 185 100 175 112 C168 120 158 125 152 118" fill="none" stroke="#0B3D91" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M152 118 C160 108 172 95 185 88 C200 80 218 78 230 85 C240 90 242 102 235 112 C228 122 215 128 200 125 C190 123 185 115 190 105 C195 95 210 88 225 85 C240 82 255 85 265 78" fill="none" stroke="#0B3D91" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M265 78 C275 70 288 62 300 58 C315 52 330 55 340 65 C348 72 345 85 335 95 C325 105 310 110 300 105 C292 100 295 88 305 80 C315 72 330 68 345 72 C360 76 370 85 375 78 C380 70 385 60 395 55" fill="none" stroke="#0B3D91" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M395 55 C405 50 415 52 420 60 C425 68 418 78 410 82 C402 86 395 80 398 72" fill="none" stroke="#0B3D91" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M80 135 C120 132 180 128 250 130 C320 132 370 128 410 125" fill="none" stroke="#0B3D91" stroke-width="0.8" stroke-linecap="round" stroke-dasharray="2,4" opacity="0.4"/>
  </g>
</svg>`;

/** Toggle for admin to enable/disable signature for self + manage managers */
export const AdminSignatureToggle = () => {
  const { lang } = useLanguage();
  const {
    isAdmin, isManager, myEnabled, canUseSignature,
    managerStatuses, toggleMy, toggleManager,
  } = useSignaturePermission();

  // Only admin sees the toggle UI; managers never see it
  if (!isAdmin) return null;

  // Admin: toggle self + manage managers
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
      <div dangerouslySetInnerHTML={{ __html: SIGNATURE_SVG }} />
      <p style={{ fontSize: 10, color: "#666", fontFamily: "'Amiri', serif" }}>إدارة الأكاديمية</p>
    </div>
  );
};

export { SIGNATURE_SVG };
