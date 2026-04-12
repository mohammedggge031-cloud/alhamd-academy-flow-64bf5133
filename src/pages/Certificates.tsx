import { useState, useRef, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer, MousePointerClick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import academyLogo from "@/assets/academy-logo.jpeg";

const CERT_TEMPLATES = [
  {
    id: "appreciation",
    labelAr: "شهادة تقدير وانضباط",
    labelEn: "Appreciation & Discipline",
    defaultTextAr: "تقديراً لجهوده/ا المتميزة وانضباطه/ا المشهود في حلقات تحفيظ القرآن الكريم وتعلم التجويد واللغة العربية والدراسات الإسلامية.\nسائلين المولى عزوجل له/ا ولأهله/ا دوام التوفيق والسداد.",
    defaultTextEn: "In recognition of their outstanding efforts and exemplary discipline in the Quran memorization, Tajweed, Arabic language, and Islamic studies programs.\nMay Allah grant them and their family continued success.",
  },
  {
    id: "completion",
    labelAr: "شهادة إتمام الحفظ",
    labelEn: "Quran Completion",
    defaultTextAr: "لإتمامه/ا حفظ القرآن الكريم كاملاً بتوفيق من الله تعالى.\nنسأل الله أن يجعله حجة له لا عليه وأن ينفعه به في الدنيا والآخرة.",
    defaultTextEn: "For the successful completion of the memorization of the Holy Quran by the grace of Allah.\nMay Allah make it a source of benefit in this life and the hereafter.",
  },
  {
    id: "excellence",
    labelAr: "شهادة تفوق",
    labelEn: "Excellence Certificate",
    defaultTextAr: "تقديراً لتفوقه/ا الملحوظ في دراسة القرآن الكريم والتجويد واللغة العربية والعلوم الإسلامية.\nنسأل الله أن يبارك في علمه وعمله.",
    defaultTextEn: "In recognition of outstanding excellence in the study of the Holy Quran, Tajweed, Arabic language, and Islamic sciences.\nMay Allah bless their knowledge and deeds.",
  },
  {
    id: "tajweed",
    labelAr: "شهادة إتقان التجويد",
    labelEn: "Tajweed Mastery",
    defaultTextAr: "لإتقانه/ا أحكام التجويد وتلاوة القرآن الكريم بإتقان وتدبر.\nنسأل الله أن يرزقه/ا حسن التلاوة والعمل بما فيه.",
    defaultTextEn: "For mastering the rules of Tajweed and reciting the Holy Quran with proficiency and reflection.\nMay Allah grant them beautiful recitation and the ability to act upon it.",
  },
];

const generateCertNumber = () => `CERT-${String(Math.floor(Math.random() * 90000) + 10000)}`;

const CertificatesPage = memo(() => {
  const { t, lang } = useLanguage();
  const { session, isAuthReady } = useAuth();
  const { toast } = useToast();
  const queryEnabled = isAuthReady && !!session?.user;
  const previewRef = useRef<HTMLDivElement>(null);

  // Load Amiri font
  useState(() => {
    if (!document.querySelector('link[href*="Amiri"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap";
      document.head.appendChild(link);
    }
  });

  const [selectedStudent, setSelectedStudent] = useState("");
  const [template, setTemplate] = useState("appreciation");
  const [manualEdit, setManualEdit] = useState(false);

  const templateConfig = CERT_TEMPLATES.find((t) => t.id === template)!;

  // All editable fields with defaults from template
  const [customTextAr, setCustomTextAr] = useState(templateConfig.defaultTextAr);
  const [customTextEn, setCustomTextEn] = useState(templateConfig.defaultTextEn);
  const [academyNameAr, setAcademyNameAr] = useState("أكاديمية الحمد");
  const [academyNameEn, setAcademyNameEn] = useState("Alhamd Academy");
  const [academySubAr, setAcademySubAr] = useState("لتعليم القرآن والتجويد والعربية والدراسات الإسلامية");
  const [academySubEn, setAcademySubEn] = useState("Quran, Tajweed, Arabic & Islamic Studies");
  const [certTitleAr, setCertTitleAr] = useState(templateConfig.labelAr);
  const [certTitleEn, setCertTitleEn] = useState(templateConfig.labelEn);
  const [introAr, setIntroAr] = useState("تتشرف إدارة الأكاديمية بمنح هذه الشهادة للطالب/ة");
  const [introEn, setIntroEn] = useState("The Academy is honored to present this certificate to");
  const [signatureName, setSignatureName] = useState(lang === "ar" ? "إدارة الأكاديمية" : "Academy Administration");
  const [certDate] = useState(() => {
    const now = new Date();
    return {
      ar: now.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
      en: now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    };
  });
  const [certNumber] = useState(generateCertNumber);

  // Update texts when template changes
  const handleTemplateChange = (newTemplate: string) => {
    setTemplate(newTemplate);
    const config = CERT_TEMPLATES.find((t) => t.id === newTemplate)!;
    setCustomTextAr(config.defaultTextAr);
    setCustomTextEn(config.defaultTextEn);
    setCertTitleAr(config.labelAr);
    setCertTitleEn(config.labelEn);
  };

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["cert-students", session?.user?.id],
    enabled: queryEnabled,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedStudentName = students.find((s) => s.id === selectedStudent)?.name || "";

  const handlePrint = useCallback(() => {
    if (!selectedStudent) {
      toast({ title: lang === "ar" ? "اختر طالباً أولاً" : "Select a student first", variant: "destructive" });
      return;
    }
    const el = previewRef.current;
    if (!el) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { display:flex; justify-content:center; align-items:center; min-height:100vh; background:#fff; }
        [contenteditable] { outline: none !important; border: none !important; box-shadow: none !important; }
        @media print { body { background:transparent; } @page { size: landscape A4; margin: 0; } }
      </style></head><body>${el.innerHTML}</body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); printWin.close(); }, 600);
  }, [selectedStudent, toast, lang]);

  if (!queryEnabled || isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-7 w-7 text-primary" />
          {t("navCertificates")}
        </h1>
        <p className="text-muted-foreground">
          {lang === "ar" ? "تصميم وطباعة شهادات تقدير احترافية ثنائية اللغة" : "Design and print professional bilingual certificates"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Controls */}
        <Card className="border-none shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{lang === "ar" ? "إعدادات الشهادة" : "Certificate Settings"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("student")}</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue placeholder={lang === "ar" ? "اختر الطالب" : "Select student"} /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{lang === "ar" ? "نوع الشهادة" : "Certificate Type"}</Label>
              <Select value={template} onValueChange={handleTemplateChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CERT_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {lang === "ar" ? t.labelAr : t.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manual edit toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-primary" />
                <Label className="text-sm cursor-pointer">{lang === "ar" ? "التعديل اليدوي" : "Manual Edit"}</Label>
              </div>
              <Switch checked={manualEdit} onCheckedChange={setManualEdit} />
            </div>
            {manualEdit && (
              <p className="text-xs text-muted-foreground">
                {lang === "ar" ? "اضغط على أي نص في الشهادة لتعديله مباشرة" : "Click any text on the certificate to edit it directly"}
              </p>
            )}

            <Tabs defaultValue="text" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="text">{lang === "ar" ? "النصوص" : "Text"}</TabsTrigger>
                <TabsTrigger value="branding">{lang === "ar" ? "الهوية" : "Branding"}</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "عنوان الشهادة (عربي)" : "Certificate Title (Arabic)"}</Label>
                  <Input value={certTitleAr} onChange={(e) => setCertTitleAr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "عنوان الشهادة (إنجليزي)" : "Certificate Title (English)"}</Label>
                  <Input value={certTitleEn} onChange={(e) => setCertTitleEn(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "المقدمة (عربي)" : "Intro (Arabic)"}</Label>
                  <Input value={introAr} onChange={(e) => setIntroAr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "المقدمة (إنجليزي)" : "Intro (English)"}</Label>
                  <Input value={introEn} onChange={(e) => setIntroEn(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "نص عربي" : "Arabic Text"}</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[70px]"
                    value={customTextAr}
                    onChange={(e) => setCustomTextAr(e.target.value)}
                    dir="rtl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "نص إنجليزي" : "English Text"}</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[70px]"
                    value={customTextEn}
                    onChange={(e) => setCustomTextEn(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "اسم الموقّع" : "Signatory Name"}</Label>
                  <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="branding" className="space-y-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "اسم الأكاديمية (عربي)" : "Academy Name (Arabic)"}</Label>
                  <Input value={academyNameAr} onChange={(e) => setAcademyNameAr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "اسم الأكاديمية (إنجليزي)" : "Academy Name (English)"}</Label>
                  <Input value={academyNameEn} onChange={(e) => setAcademyNameEn(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "الوصف (عربي)" : "Subtitle (Arabic)"}</Label>
                  <Input value={academySubAr} onChange={(e) => setAcademySubAr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "الوصف (إنجليزي)" : "Subtitle (English)"}</Label>
                  <Input value={academySubEn} onChange={(e) => setAcademySubEn(e.target.value)} dir="ltr" />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1 gap-2" variant="outline" onClick={handlePrint} disabled={!selectedStudent}>
                <Printer className="h-4 w-4" />
                {lang === "ar" ? "طباعة" : "Print"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{lang === "ar" ? "معاينة الشهادة" : "Certificate Preview"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={previewRef} className="mx-auto" style={{ maxWidth: 780 }}>
              <CertificateTemplate
                academyNameAr={academyNameAr}
                academyNameEn={academyNameEn}
                academySubAr={academySubAr}
                academySubEn={academySubEn}
                certTitleAr={certTitleAr}
                certTitleEn={certTitleEn}
                studentName={selectedStudentName}
                bodyTextAr={customTextAr}
                bodyTextEn={customTextEn}
                introAr={introAr}
                introEn={introEn}
                certDate={certDate}
                certNumber={certNumber}
                signatureName={signatureName}
                manualEdit={manualEdit}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

interface CertTemplateProps {
  academyNameAr: string;
  academyNameEn: string;
  academySubAr: string;
  academySubEn: string;
  certTitleAr: string;
  certTitleEn: string;
  studentName: string;
  bodyTextAr: string;
  bodyTextEn: string;
  introAr: string;
  introEn: string;
  certDate: { ar: string; en: string };
  certNumber: string;
  signatureName: string;
  manualEdit: boolean;
}

const CertificateTemplate = memo(({
  academyNameAr, academyNameEn, academySubAr, academySubEn,
  certTitleAr, certTitleEn, studentName,
  bodyTextAr, bodyTextEn, introAr, introEn,
  certDate, certNumber, signatureName, manualEdit,
}: CertTemplateProps) => {
  const gold = "#b8860b";
  const darkGold = "#8B6914";
  const navy = "#0a2a5e";

  const editable = manualEdit ? {
    contentEditable: true,
    suppressContentEditableWarning: true,
    style: { cursor: "text" as const },
  } : {};

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "1.414",
        background: `
          radial-gradient(ellipse at 20% 20%, rgba(184,134,11,0.04) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(184,134,11,0.04) 0%, transparent 50%),
          linear-gradient(145deg, #fffef5 0%, #fff 40%, #fef9e7 100%)
        `,
        border: `3px solid ${gold}`,
        borderRadius: 12,
        padding: "clamp(18px, 3vw, 40px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "'Amiri', serif",
        position: "relative",
        overflow: "hidden",
        boxShadow: `inset 0 0 0 1.5px #fff, inset 0 0 0 4px rgba(184,134,11,0.15), 0 4px 24px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Outer decorative border */}
      <div style={{
        position: "absolute", inset: 8,
        border: `1px solid rgba(184,134,11,0.2)`,
        borderRadius: 8,
        pointerEvents: "none",
      }} />

      {/* Inner decorative border */}
      <div style={{
        position: "absolute", inset: 14,
        border: `0.5px solid rgba(184,134,11,0.1)`,
        borderRadius: 6,
        pointerEvents: "none",
      }} />

      {/* Corner ornaments */}
      {["top-left", "top-right", "bottom-left", "bottom-right"].map((pos) => {
        const isTop = pos.includes("top");
        const isLeft = pos.includes("left");
        return (
          <div key={pos} style={{
            position: "absolute",
            [isTop ? "top" : "bottom"]: 20,
            [isLeft ? "left" : "right"]: 20,
            fontSize: 18, opacity: 0.15, color: gold,
            transform: `rotate(${isTop && isLeft ? 0 : isTop ? 90 : isLeft ? 270 : 180}deg)`,
          }}>❦</div>
        );
      })}

      {/* Header with logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px, 2vw, 20px)", marginBottom: "clamp(2px, 0.6vw, 8px)" }}>
        <div style={{ textAlign: "center" }}>
          <p {...editable} style={{ fontSize: "clamp(9px, 1.2vw, 13px)", color: navy, letterSpacing: 1.5, fontWeight: 400, textTransform: "uppercase" }}>
            {academyNameEn}
          </p>
          <p {...editable} style={{ fontSize: "clamp(6px, 0.8vw, 9px)", color: "#999", marginTop: 1, letterSpacing: 0.5 }}>
            {academySubEn}
          </p>
        </div>
        <img
          src={academyLogo}
          alt="Academy Logo"
          style={{
            width: "clamp(48px, 6.5vw, 82px)",
            height: "clamp(48px, 6.5vw, 82px)",
            objectFit: "contain",
            borderRadius: "50%",
            border: `2px solid rgba(184,134,11,0.2)`,
            padding: 2,
          }}
        />
        <div style={{ textAlign: "center" }}>
          <p {...editable} style={{ fontSize: "clamp(14px, 2.2vw, 22px)", fontWeight: 700, color: navy }}>
            {academyNameAr}
          </p>
          <p {...editable} style={{ fontSize: "clamp(6px, 0.8vw, 9px)", color: "#999", marginTop: 1 }}>
            {academySubAr}
          </p>
        </div>
      </div>

      {/* Decorative line */}
      <div style={{
        width: "50%", height: 1,
        background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
        marginBottom: "clamp(6px, 1vw, 12px)",
      }} />

      {/* Certificate type badge */}
      <div style={{ textAlign: "center", marginBottom: "clamp(4px, 0.6vw, 8px)" }}>
        <div style={{
          background: `linear-gradient(135deg, ${navy}, ${navy}dd)`,
          color: "#fff",
          padding: "4px 28px",
          borderRadius: 24,
          fontSize: "clamp(11px, 1.5vw, 15px)",
          fontWeight: 700,
          display: "inline-block",
          letterSpacing: 1,
          boxShadow: "0 2px 8px rgba(10,42,94,0.2)",
        }}>
          <span {...editable}>{certTitleAr}</span>
        </div>
        <p {...editable} style={{ fontSize: "clamp(8px, 1vw, 11px)", color: navy, marginTop: 3, fontStyle: "italic", fontFamily: "Georgia, serif", letterSpacing: 1 }}>
          {certTitleEn}
        </p>
      </div>

      {/* Arabic intro */}
      <p {...editable} dir="rtl" style={{ fontSize: "clamp(9px, 1.3vw, 13px)", color: "#555", textAlign: "center" }}>
        {introAr}
      </p>
      <p {...editable} style={{ fontSize: "clamp(7px, 0.9vw, 10px)", color: "#888", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
        {introEn}
      </p>

      {/* Student name */}
      <div style={{
        margin: "clamp(4px, 0.8vw, 10px) 0",
        textAlign: "center",
        position: "relative",
      }}>
        <p {...editable} style={{
          fontSize: "clamp(18px, 3vw, 32px)",
          fontWeight: 700,
          color: darkGold,
          paddingBottom: 4,
          minWidth: "50%",
          textAlign: "center",
          background: `linear-gradient(to right, ${gold}, ${darkGold})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          {studentName || ".................."}
        </p>
        <div style={{
          width: "80%",
          margin: "0 auto",
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${gold} 20%, ${gold} 80%, transparent 100%)`,
        }} />
      </div>

      {/* Body text - Arabic */}
      <p {...editable} dir="rtl" style={{
        fontSize: "clamp(8px, 1.1vw, 12px)",
        color: "#555",
        textAlign: "center",
        lineHeight: 1.8,
        maxWidth: "80%",
        whiteSpace: "pre-line",
        marginBottom: "clamp(2px, 0.4vw, 5px)",
      }}>
        {bodyTextAr}
      </p>

      {/* Body text - English */}
      <p {...editable} dir="ltr" style={{
        fontSize: "clamp(7px, 0.9vw, 10px)",
        color: "#888",
        textAlign: "center",
        lineHeight: 1.6,
        maxWidth: "80%",
        whiteSpace: "pre-line",
        fontFamily: "Georgia, serif",
        fontStyle: "italic",
      }}>
        {bodyTextEn}
      </p>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Signature & Footer */}
      <div style={{
        width: "85%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        fontSize: "clamp(7px, 1vw, 10px)",
        color: "#888",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 90, borderTop: `1px solid ${gold}`, marginBottom: 4, opacity: 0.6 }} />
          <span {...editable}>{signatureName}</span>
        </div>
        <div style={{ textAlign: "center", fontSize: "clamp(6px, 0.8vw, 9px)" }}>
          <p>{certDate.ar}</p>
          <p style={{ fontFamily: "Georgia, serif" }}>{certDate.en}</p>
          <p style={{ marginTop: 2, color: "#bbb", fontSize: "clamp(5px, 0.7vw, 8px)" }}>{certNumber}</p>
        </div>
      </div>
    </div>
  );
});

CertificateTemplate.displayName = "CertificateTemplate";
CertificatesPage.displayName = "CertificatesPage";
export default CertificatesPage;
