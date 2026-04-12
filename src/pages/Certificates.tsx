import { useState, useRef, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer } from "lucide-react";
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

const DIMENSION_PRESETS = [
  { id: "a4-landscape", label: "A4 Landscape", width: 780, aspectRatio: "1.414" },
  { id: "a4-portrait", label: "A4 Portrait", width: 560, aspectRatio: "0.707" },
  { id: "letter-landscape", label: "Letter Landscape", width: 780, aspectRatio: "1.294" },
  { id: "square", label: "Square", width: 600, aspectRatio: "1" },
  { id: "custom", label: "Custom", width: 780, aspectRatio: "1.414" },
];

const CertificatesPage = memo(() => {
  const { t, lang } = useLanguage();
  const { session, isAuthReady } = useAuth();
  const { toast } = useToast();
  const queryEnabled = isAuthReady && !!session?.user;
  const previewRef = useRef<HTMLDivElement>(null);

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

  const templateConfig = CERT_TEMPLATES.find((t) => t.id === template)!;

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

  // Style controls
  const [titleFontSize, setTitleFontSize] = useState(100); // percentage
  const [bodyFontSize, setBodyFontSize] = useState(100);
  const [nameFontSize, setNameFontSize] = useState(100);
  const [titleColorAr, setTitleColorAr] = useState("#0a2a5e");
  const [titleColorEn, setTitleColorEn] = useState("#0a2a5e");
  const [bodyColorAr, setBodyColorAr] = useState("#555555");
  const [bodyColorEn, setBodyColorEn] = useState("#888888");
  const [nameColor, setNameColor] = useState("#8B6914");
  const [bgColor, setBgColor] = useState("#fffef5");
  const [borderColor, setBorderColor] = useState("#b8860b");

  // Dimension controls
  const [dimensionPreset, setDimensionPreset] = useState("a4-landscape");
  const [certWidth, setCertWidth] = useState(780);
  const [certAspectRatio, setCertAspectRatio] = useState("1.414");

  const handleDimensionChange = (presetId: string) => {
    setDimensionPreset(presetId);
    if (presetId !== "custom") {
      const preset = DIMENSION_PRESETS.find(p => p.id === presetId)!;
      setCertWidth(preset.width);
      setCertAspectRatio(preset.aspectRatio);
    }
  };

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
        @media print { body { background:transparent; } @page { size: ${parseFloat(certAspectRatio) > 1 ? 'landscape' : 'portrait'} A4; margin: 0; } }
      </style></head><body>${el.innerHTML}</body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); printWin.close(); }, 600);
  }, [selectedStudent, toast, lang, certAspectRatio]);

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

            <p className="text-xs text-muted-foreground">
              {lang === "ar" ? "اضغط على أي نص في الشهادة لتعديله مباشرة" : "Click any text on the certificate to edit it directly"}
            </p>

            <Tabs defaultValue="text" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="text">{lang === "ar" ? "النصوص" : "Text"}</TabsTrigger>
                <TabsTrigger value="style">{lang === "ar" ? "التنسيق" : "Style"}</TabsTrigger>
                <TabsTrigger value="size">{lang === "ar" ? "المقاس" : "Size"}</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "عنوان الشهادة (عربي)" : "Title (AR)"}</Label>
                  <Input value={certTitleAr} onChange={(e) => setCertTitleAr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "عنوان الشهادة (إنجليزي)" : "Title (EN)"}</Label>
                  <Input value={certTitleEn} onChange={(e) => setCertTitleEn(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "المقدمة (عربي)" : "Intro (AR)"}</Label>
                  <Input value={introAr} onChange={(e) => setIntroAr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "المقدمة (إنجليزي)" : "Intro (EN)"}</Label>
                  <Input value={introEn} onChange={(e) => setIntroEn(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "نص عربي" : "Arabic Text"}</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[70px]"
                    value={customTextAr} onChange={(e) => setCustomTextAr(e.target.value)} dir="rtl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "نص إنجليزي" : "English Text"}</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[70px]"
                    value={customTextEn} onChange={(e) => setCustomTextEn(e.target.value)} dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "اسم الموقّع" : "Signatory"}</Label>
                  <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "اسم الأكاديمية (عربي)" : "Academy (AR)"}</Label>
                  <Input value={academyNameAr} onChange={(e) => setAcademyNameAr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "اسم الأكاديمية (إنجليزي)" : "Academy (EN)"}</Label>
                  <Input value={academyNameEn} onChange={(e) => setAcademyNameEn(e.target.value)} dir="ltr" />
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-4 mt-3">
                {/* Font Sizes */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{lang === "ar" ? "أحجام الخطوط" : "Font Sizes"}</Label>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{lang === "ar" ? "العنوان" : "Title"}</span>
                      <span>{titleFontSize}%</span>
                    </div>
                    <Slider value={[titleFontSize]} onValueChange={([v]) => setTitleFontSize(v)} min={50} max={200} step={5} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{lang === "ar" ? "اسم الطالب" : "Student Name"}</span>
                      <span>{nameFontSize}%</span>
                    </div>
                    <Slider value={[nameFontSize]} onValueChange={([v]) => setNameFontSize(v)} min={50} max={200} step={5} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{lang === "ar" ? "النص الأساسي" : "Body Text"}</span>
                      <span>{bodyFontSize}%</span>
                    </div>
                    <Slider value={[bodyFontSize]} onValueChange={([v]) => setBodyFontSize(v)} min={50} max={200} step={5} />
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{lang === "ar" ? "الألوان" : "Colors"}</Label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">{lang === "ar" ? "العنوان عربي" : "Title AR"}</Label>
                      <div className="flex items-center gap-1">
                        <input type="color" value={titleColorAr} onChange={e => setTitleColorAr(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                        <Input value={titleColorAr} onChange={e => setTitleColorAr(e.target.value)} className="h-7 text-[10px] font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{lang === "ar" ? "العنوان إنجليزي" : "Title EN"}</Label>
                      <div className="flex items-center gap-1">
                        <input type="color" value={titleColorEn} onChange={e => setTitleColorEn(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                        <Input value={titleColorEn} onChange={e => setTitleColorEn(e.target.value)} className="h-7 text-[10px] font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{lang === "ar" ? "النص عربي" : "Body AR"}</Label>
                      <div className="flex items-center gap-1">
                        <input type="color" value={bodyColorAr} onChange={e => setBodyColorAr(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                        <Input value={bodyColorAr} onChange={e => setBodyColorAr(e.target.value)} className="h-7 text-[10px] font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{lang === "ar" ? "النص إنجليزي" : "Body EN"}</Label>
                      <div className="flex items-center gap-1">
                        <input type="color" value={bodyColorEn} onChange={e => setBodyColorEn(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                        <Input value={bodyColorEn} onChange={e => setBodyColorEn(e.target.value)} className="h-7 text-[10px] font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{lang === "ar" ? "اسم الطالب" : "Name"}</Label>
                      <div className="flex items-center gap-1">
                        <input type="color" value={nameColor} onChange={e => setNameColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                        <Input value={nameColor} onChange={e => setNameColor(e.target.value)} className="h-7 text-[10px] font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{lang === "ar" ? "الإطار" : "Border"}</Label>
                      <div className="flex items-center gap-1">
                        <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                        <Input value={borderColor} onChange={e => setBorderColor(e.target.value)} className="h-7 text-[10px] font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[10px]">{lang === "ar" ? "خلفية الشهادة" : "Background"}</Label>
                      <div className="flex items-center gap-1">
                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                        <Input value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-7 text-[10px] font-mono" />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="size" className="space-y-4 mt-3">
                <div className="space-y-2">
                  <Label className="text-xs">{lang === "ar" ? "مقاس الشهادة" : "Certificate Size"}</Label>
                  <Select value={dimensionPreset} onValueChange={handleDimensionChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIMENSION_PRESETS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {dimensionPreset === "custom" && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{lang === "ar" ? "العرض (px)" : "Width (px)"}</span>
                        <span>{certWidth}px</span>
                      </div>
                      <Slider value={[certWidth]} onValueChange={([v]) => setCertWidth(v)} min={400} max={1200} step={10} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{lang === "ar" ? "نسبة الأبعاد (عرض/ارتفاع)" : "Aspect Ratio (W/H)"}</Label>
                      <div className="flex gap-2">
                        {[
                          { label: "16:9", val: "1.778" },
                          { label: "A4 ⬌", val: "1.414" },
                          { label: "4:3", val: "1.333" },
                          { label: "1:1", val: "1" },
                          { label: "A4 ⬍", val: "0.707" },
                        ].map(r => (
                          <Button
                            key={r.val}
                            size="sm"
                            variant={certAspectRatio === r.val ? "default" : "outline"}
                            className="text-[10px] px-2 h-7 flex-1"
                            onClick={() => setCertAspectRatio(r.val)}
                          >
                            {r.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="p-2 rounded-md bg-muted text-xs text-muted-foreground">
                  {lang === "ar"
                    ? `الأبعاد الحالية: ${certWidth}px × ${Math.round(certWidth / parseFloat(certAspectRatio))}px`
                    : `Current: ${certWidth}px × ${Math.round(certWidth / parseFloat(certAspectRatio))}px`}
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
            <div ref={previewRef} className="mx-auto" style={{ maxWidth: certWidth }}>
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
                manualEdit={true}
                titleFontSize={titleFontSize}
                bodyFontSize={bodyFontSize}
                nameFontSize={nameFontSize}
                titleColorAr={titleColorAr}
                titleColorEn={titleColorEn}
                bodyColorAr={bodyColorAr}
                bodyColorEn={bodyColorEn}
                nameColor={nameColor}
                bgColor={bgColor}
                borderColor={borderColor}
                aspectRatio={certAspectRatio}
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
  titleFontSize: number;
  bodyFontSize: number;
  nameFontSize: number;
  titleColorAr: string;
  titleColorEn: string;
  bodyColorAr: string;
  bodyColorEn: string;
  nameColor: string;
  bgColor: string;
  borderColor: string;
  aspectRatio: string;
}

const CertificateTemplate = memo(({
  academyNameAr, academyNameEn, academySubAr, academySubEn,
  certTitleAr, certTitleEn, studentName,
  bodyTextAr, bodyTextEn, introAr, introEn,
  certDate, certNumber, signatureName, manualEdit,
  titleFontSize, bodyFontSize, nameFontSize,
  titleColorAr, titleColorEn, bodyColorAr, bodyColorEn,
  nameColor, bgColor, borderColor, aspectRatio,
}: CertTemplateProps) => {
  const navy = titleColorAr;
  const gold = borderColor;
  const darkGold = nameColor;

  const sf = (base: number, scale: number) => `${Math.round(base * scale / 100)}px`;

  const editable = manualEdit ? {
    contentEditable: true,
    suppressContentEditableWarning: true,
    style: { cursor: "text" as const },
  } : {};

  return (
    <div
      style={{
        width: "100%",
        aspectRatio,
        background: `
          radial-gradient(ellipse at 20% 20%, ${gold}0a 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, ${gold}0a 0%, transparent 50%),
          linear-gradient(145deg, ${bgColor} 0%, #fff 40%, ${bgColor} 100%)
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
        boxShadow: `inset 0 0 0 1.5px #fff, inset 0 0 0 4px ${gold}26, 0 4px 24px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Decorative borders */}
      <div style={{ position: "absolute", inset: 8, border: `1px solid ${gold}33`, borderRadius: 8, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 14, border: `0.5px solid ${gold}1a`, borderRadius: 6, pointerEvents: "none" }} />

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

      {/* Header */}
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
            border: `2px solid ${gold}33`,
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

      {/* Line */}
      <div style={{ width: "50%", height: 1, background: `linear-gradient(90deg, transparent, ${gold}, transparent)`, marginBottom: "clamp(6px, 1vw, 12px)" }} />

      {/* Badge */}
      <div style={{ textAlign: "center", marginBottom: "clamp(4px, 0.6vw, 8px)" }}>
        <div style={{
          background: `linear-gradient(135deg, ${titleColorAr}, ${titleColorAr}dd)`,
          color: "#fff",
          padding: "4px 28px",
          borderRadius: 24,
          fontSize: sf(15, titleFontSize),
          fontWeight: 700,
          display: "inline-block",
          letterSpacing: 1,
          boxShadow: `0 2px 8px ${titleColorAr}33`,
        }}>
          <span {...editable}>{certTitleAr}</span>
        </div>
        <p {...editable} style={{ fontSize: sf(11, titleFontSize), color: titleColorEn, marginTop: 3, fontStyle: "italic", fontFamily: "Georgia, serif", letterSpacing: 1 }}>
          {certTitleEn}
        </p>
      </div>

      {/* Intro */}
      <p {...editable} dir="rtl" style={{ fontSize: sf(13, bodyFontSize), color: bodyColorAr, textAlign: "center" }}>
        {introAr}
      </p>
      <p {...editable} style={{ fontSize: sf(10, bodyFontSize), color: bodyColorEn, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
        {introEn}
      </p>

      {/* Student Name */}
      <div style={{ margin: "clamp(4px, 0.8vw, 10px) 0", textAlign: "center", position: "relative" }}>
        <p {...editable} style={{
          fontSize: sf(32, nameFontSize),
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
        <div style={{ width: "80%", margin: "0 auto", height: 1, background: `linear-gradient(90deg, transparent 0%, ${gold} 20%, ${gold} 80%, transparent 100%)` }} />
      </div>

      {/* Body AR */}
      <p {...editable} dir="rtl" style={{
        fontSize: sf(12, bodyFontSize),
        color: bodyColorAr,
        textAlign: "center",
        lineHeight: 1.8,
        maxWidth: "80%",
        whiteSpace: "pre-line",
        marginBottom: "clamp(2px, 0.4vw, 5px)",
      }}>
        {bodyTextAr}
      </p>

      {/* Body EN */}
      <p {...editable} dir="ltr" style={{
        fontSize: sf(10, bodyFontSize),
        color: bodyColorEn,
        textAlign: "center",
        lineHeight: 1.6,
        maxWidth: "80%",
        whiteSpace: "pre-line",
        fontFamily: "Georgia, serif",
        fontStyle: "italic",
      }}>
        {bodyTextEn}
      </p>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{
        width: "85%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        fontSize: sf(10, bodyFontSize),
        color: "#888",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 90, borderTop: `1px solid ${gold}`, marginBottom: 4, opacity: 0.6 }} />
          <span {...editable}>{signatureName}</span>
        </div>
        <div style={{ textAlign: "center", fontSize: sf(9, bodyFontSize) }}>
          <p>{certDate.ar}</p>
          <p style={{ fontFamily: "Georgia, serif" }}>{certDate.en}</p>
          <p style={{ marginTop: 2, color: "#bbb", fontSize: sf(8, bodyFontSize) }}>{certNumber}</p>
        </div>
      </div>
    </div>
  );
});

CertificateTemplate.displayName = "CertificateTemplate";
CertificatesPage.displayName = "CertificatesPage";
export default CertificatesPage;
