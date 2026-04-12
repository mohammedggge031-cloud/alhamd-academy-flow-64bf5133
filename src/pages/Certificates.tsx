import { useState, useRef, useCallback, memo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer, Languages, Download, Image, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toPng } from "html-to-image";
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

const RECIPIENT_TYPES = [
  { id: "student", labelAr: "طالب/ة", labelEn: "Student" },
  { id: "teacher", labelAr: "معلم/ة", labelEn: "Teacher" },
  { id: "manager", labelAr: "مشرف/ة", labelEn: "Manager" },
  { id: "admin", labelAr: "مدير/ة", labelEn: "Director" },
];

const DIMENSION_PRESETS = [
  { id: "a4-landscape", label: "A4 Landscape", width: 780, aspectRatio: "1.414" },
  { id: "a4-portrait", label: "A4 Portrait", width: 560, aspectRatio: "0.707" },
  { id: "letter-landscape", label: "Letter Landscape", width: 780, aspectRatio: "1.294" },
  { id: "square", label: "Square", width: 600, aspectRatio: "1" },
  { id: "custom", label: "Custom", width: 780, aspectRatio: "1.414" },
];

import signatureImg from "@/assets/sig-mark-2.png";

const CertificatesPage = memo(() => {
  const { t, lang } = useLanguage();
  const { session, role, isAuthReady } = useAuth();
  const { toast } = useToast();
  const queryEnabled = isAuthReady && !!session?.user;
  const previewRef = useRef<HTMLDivElement>(null);

  // Role-based access: admin can do everything, manager can only create for students & teachers
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  // Block teachers from accessing
  useEffect(() => {
    if (isAuthReady && role === "teacher") {
      window.location.href = "/";
    }
  }, [isAuthReady, role]);

  useState(() => {
    if (!document.querySelector('link[href*="Amiri"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap";
      document.head.appendChild(link);
    }
  });

  const [recipientType, setRecipientType] = useState("student");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [customRecipientName, setCustomRecipientName] = useState("");
  const [template, setTemplate] = useState("appreciation");
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [showSignature, setShowSignature] = useState(true);

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

  // Editable date
  const [certDateAr, setCertDateAr] = useState(() =>
    new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
  );
  const [certDateEn, setCertDateEn] = useState(() =>
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  );
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 10));

  const handleDateChange = (val: string) => {
    setDateInput(val);
    if (val) {
      const d = new Date(val + "T12:00:00");
      setCertDateAr(d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }));
      setCertDateEn(d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    }
  };

  // Style controls
  const [titleFontSize, setTitleFontSize] = useState(100);
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

  // Auto-translate helper (simple mapping for common certificate phrases)
  const simpleTranslateArToEn = (text: string): string => {
    // Basic auto-translate: just updates the English field with a note
    // For production, this would call an AI API
    return text;
  };

  const handleArTextChange = (setter: (v: string) => void, enSetter: (v: string) => void, value: string) => {
    setter(value);
    if (autoTranslate) {
      // Use AI gateway for translation
      translateText(value, "ar", "en").then(translated => {
        if (translated) enSetter(translated);
      });
    }
  };

  const translateText = async (text: string, from: string, to: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-translate", {
        body: { text, from, to },
      });
      if (error || !data?.translated) return null;
      return data.translated;
    } catch {
      return null;
    }
  };

  // Fetch recipients based on type
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["cert-students", session?.user?.id],
    enabled: queryEnabled && (recipientType === "student"),
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

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["cert-teachers", session?.user?.id],
    enabled: queryEnabled && (recipientType === "teacher"),
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, user_id, profiles:user_id(full_name)")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []).map((t: any) => ({ id: t.id, name: t.profiles?.full_name || "—" }));
    },
  });

  const { data: managers = [], isLoading: managersLoading } = useQuery({
    queryKey: ["cert-managers", session?.user?.id],
    enabled: queryEnabled && isAdmin && (recipientType === "manager" || recipientType === "admin"),
    retry: 1,
    queryFn: async () => {
      const targetRole = recipientType === "manager" ? "manager" : "admin";
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", targetRole);
      if (error) throw error;
      const userIds = (data ?? []).map(r => r.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      return (profiles ?? []).map(p => ({ id: p.user_id, name: p.full_name }));
    },
  });

  // Filter recipient types based on role
  const availableRecipientTypes = isAdmin
    ? RECIPIENT_TYPES
    : RECIPIENT_TYPES.filter(r => r.id === "student" || r.id === "teacher");

  const getRecipientList = () => {
    switch (recipientType) {
      case "student": return students;
      case "teacher": return teachers;
      case "manager":
      case "admin": return managers;
      default: return [];
    }
  };

  const recipientList = getRecipientList();
  const isLoadingRecipients = recipientType === "student" ? studentsLoading : recipientType === "teacher" ? teachersLoading : managersLoading;

  const selectedRecipientName = recipientList.find((s: any) => s.id === selectedRecipient)?.name || customRecipientName || "";

  // Update intro text based on recipient type
  useEffect(() => {
    const introMap: Record<string, { ar: string; en: string }> = {
      student: { ar: "تتشرف إدارة الأكاديمية بمنح هذه الشهادة للطالب/ة", en: "The Academy is honored to present this certificate to" },
      teacher: { ar: "تتشرف إدارة الأكاديمية بمنح هذه الشهادة للمعلم/ة", en: "The Academy is honored to present this certificate to the teacher" },
      manager: { ar: "تتشرف إدارة الأكاديمية بمنح هذه الشهادة للمشرف/ة", en: "The Academy is honored to present this certificate to the supervisor" },
      admin: { ar: "تتشرف إدارة الأكاديمية بمنح هذه الشهادة للمدير/ة", en: "The Academy is honored to present this certificate to the director" },
    };
    const intro = introMap[recipientType] || introMap.student;
    setIntroAr(intro.ar);
    setIntroEn(intro.en);
  }, [recipientType]);

  const handlePrint = useCallback(() => {
    if (!selectedRecipient && !customRecipientName) {
      toast({ title: lang === "ar" ? "اختر المستلم أو اكتب الاسم" : "Select recipient or enter name", variant: "destructive" });
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
  }, [selectedRecipient, customRecipientName, toast, lang, certAspectRatio]);

  const handleDownloadImage = useCallback(async () => {
    if (!selectedRecipient && !customRecipientName) {
      toast({ title: lang === "ar" ? "اختر المستلم أو اكتب الاسم" : "Select recipient or enter name", variant: "destructive" });
      return;
    }
    const el = previewRef.current;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { quality: 1, pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `certificate-${selectedRecipientName || "cert"}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: lang === "ar" ? "تم تحميل الشهادة" : "Certificate downloaded" });
    } catch {
      toast({ title: lang === "ar" ? "حدث خطأ" : "Error", variant: "destructive" });
    }
  }, [selectedRecipient, customRecipientName, selectedRecipientName, toast, lang]);

  const handleWhatsAppShare = useCallback(async () => {
    if (!selectedRecipient && !customRecipientName) {
      toast({ title: lang === "ar" ? "اختر المستلم أو اكتب الاسم" : "Select recipient or enter name", variant: "destructive" });
      return;
    }
    const name = selectedRecipientName || customRecipientName;
    const msg = `🎓 *شهادة تقدير - أكاديمية الحمد*\n\nالسلام عليكم ورحمة الله وبركاته\n\nتم إعداد شهادة تقدير للأخ/ت: ${name}\n\n${certTitleAr}\n\nبارك الله فيكم 🌟\n\n_أكاديمية الحمد لتحفيظ القرآن الكريم_`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [selectedRecipient, customRecipientName, selectedRecipientName, certTitleAr, toast, lang]);

  if (!queryEnabled || (isAuthReady && role === "teacher")) {
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
            {/* Recipient Type */}
            <div className="space-y-2">
              <Label>{lang === "ar" ? "نوع المستلم" : "Recipient Type"}</Label>
              <Select value={recipientType} onValueChange={(v) => { setRecipientType(v); setSelectedRecipient(""); setCustomRecipientName(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRecipientTypes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {lang === "ar" ? r.labelAr : r.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Selection */}
            <div className="space-y-2">
              <Label>{lang === "ar" ? "المستلم" : "Recipient"}</Label>
              {isLoadingRecipients ? (
                <Skeleton className="h-10 w-full" />
              ) : recipientList.length > 0 ? (
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger><SelectValue placeholder={lang === "ar" ? "اختر المستلم" : "Select recipient"} /></SelectTrigger>
                  <SelectContent>
                    {recipientList.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                placeholder={lang === "ar" ? "أو اكتب الاسم يدوياً" : "Or type name manually"}
                value={customRecipientName}
                onChange={(e) => { setCustomRecipientName(e.target.value); setSelectedRecipient(""); }}
                dir="rtl"
              />
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

            {/* Date */}
            <div className="space-y-2">
              <Label>{lang === "ar" ? "التاريخ" : "Date"}</Label>
              <Input type="date" value={dateInput} onChange={(e) => handleDateChange(e.target.value)} dir="ltr" />
            </div>

            {/* Auto-translate toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-primary" />
                <Label className="text-xs cursor-pointer">
                  {lang === "ar" ? "ترجمة تلقائية (عربي → إنجليزي)" : "Auto-translate (AR → EN)"}
                </Label>
              </div>
              <Switch checked={autoTranslate} onCheckedChange={setAutoTranslate} />
            </div>

            {/* Signature toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-xs cursor-pointer">
                {lang === "ar" ? "إظهار التوقيع" : "Show Signature"}
              </Label>
              <Switch checked={showSignature} onCheckedChange={setShowSignature} />
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
                  <Input value={certTitleAr} onChange={(e) => handleArTextChange(setCertTitleAr, setCertTitleEn, e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "عنوان الشهادة (إنجليزي)" : "Title (EN)"}</Label>
                  <Input value={certTitleEn} onChange={(e) => setCertTitleEn(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "المقدمة (عربي)" : "Intro (AR)"}</Label>
                  <Input value={introAr} onChange={(e) => handleArTextChange(setIntroAr, setIntroEn, e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "المقدمة (إنجليزي)" : "Intro (EN)"}</Label>
                  <Input value={introEn} onChange={(e) => setIntroEn(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{lang === "ar" ? "نص عربي" : "Arabic Text"}</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[70px]"
                    value={customTextAr} onChange={(e) => handleArTextChange(setCustomTextAr, setCustomTextEn, e.target.value)} dir="rtl"
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
                      <span>{lang === "ar" ? "الاسم" : "Name"}</span>
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

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{lang === "ar" ? "الألوان" : "Colors"}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: lang === "ar" ? "العنوان عربي" : "Title AR", value: titleColorAr, setter: setTitleColorAr },
                      { label: lang === "ar" ? "العنوان إنجليزي" : "Title EN", value: titleColorEn, setter: setTitleColorEn },
                      { label: lang === "ar" ? "النص عربي" : "Body AR", value: bodyColorAr, setter: setBodyColorAr },
                      { label: lang === "ar" ? "النص إنجليزي" : "Body EN", value: bodyColorEn, setter: setBodyColorEn },
                      { label: lang === "ar" ? "الاسم" : "Name", value: nameColor, setter: setNameColor },
                      { label: lang === "ar" ? "الإطار" : "Border", value: borderColor, setter: setBorderColor },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="space-y-1">
                        <Label className="text-[10px]">{label}</Label>
                        <div className="flex items-center gap-1">
                          <input type="color" value={value} onChange={e => setter(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                          <Input value={value} onChange={e => setter(e.target.value)} className="h-7 text-[10px] font-mono" />
                        </div>
                      </div>
                    ))}
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
                      <Label className="text-xs">{lang === "ar" ? "نسبة الأبعاد" : "Aspect Ratio"}</Label>
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
                    ? `الأبعاد: ${certWidth}px × ${Math.round(certWidth / parseFloat(certAspectRatio))}px`
                    : `Size: ${certWidth}px × ${Math.round(certWidth / parseFloat(certAspectRatio))}px`}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button className="flex-1 gap-1 text-xs" variant="outline" onClick={handlePrint} disabled={!selectedRecipient && !customRecipientName}>
                <Printer className="h-3.5 w-3.5" />
                {lang === "ar" ? "طباعة" : "Print"}
              </Button>
              <Button className="flex-1 gap-1 text-xs" variant="outline" onClick={handleDownloadImage} disabled={!selectedRecipient && !customRecipientName}>
                <Image className="h-3.5 w-3.5" />
                {lang === "ar" ? "تحميل صورة" : "Download Image"}
              </Button>
              <Button className="flex-1 gap-1 text-xs text-[#25D366]" variant="outline" onClick={handleWhatsAppShare} disabled={!selectedRecipient && !customRecipientName}>
                <MessageCircle className="h-3.5 w-3.5" />
                {lang === "ar" ? "واتساب" : "WhatsApp"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{lang === "ar" ? "معاينة الشهادة" : "Certificate Preview"}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[80vh]">
            <div ref={previewRef} className="mx-auto" style={{ width: "100%", maxWidth: certWidth }}>
              <CertificateTemplate
                academyNameAr={academyNameAr}
                academyNameEn={academyNameEn}
                academySubAr={academySubAr}
                academySubEn={academySubEn}
                certTitleAr={certTitleAr}
                certTitleEn={certTitleEn}
                studentName={selectedRecipientName}
                bodyTextAr={customTextAr}
                bodyTextEn={customTextEn}
                introAr={introAr}
                introEn={introEn}
                certDateAr={certDateAr}
                certDateEn={certDateEn}
                signatureName={signatureName}
                showSignature={showSignature}
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
  certDateAr: string;
  certDateEn: string;
  signatureName: string;
  showSignature: boolean;
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
  certDateAr, certDateEn, signatureName, showSignature,
  titleFontSize, bodyFontSize, nameFontSize,
  titleColorAr, titleColorEn, bodyColorAr, bodyColorEn,
  nameColor, bgColor, borderColor, aspectRatio,
}: CertTemplateProps) => {
  const navy = titleColorAr;
  const gold = borderColor;
  const darkGold = nameColor;

  const sf = (base: number, scale: number) => `${Math.round(base * scale / 100)}px`;

  const editable = {
    contentEditable: true,
    suppressContentEditableWarning: true,
    style: { cursor: "text" as const },
  };

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

      {/* Recipient Name */}
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
          {showSignature && (
            <img src={signatureImg} alt="Signature" style={{ width: 120, height: 45, objectFit: "contain", marginBottom: 2 }} />
          )}
          <div style={{ width: 90, borderTop: `1px solid ${gold}`, marginBottom: 4, opacity: 0.6 }} />
          <span {...editable}>{signatureName}</span>
        </div>
        <div style={{ textAlign: "center", fontSize: sf(9, bodyFontSize) }}>
          <p {...editable}>{certDateAr}</p>
          <p {...editable} style={{ fontFamily: "Georgia, serif" }}>{certDateEn}</p>
        </div>
      </div>
    </div>
  );
});

CertificateTemplate.displayName = "CertificateTemplate";
CertificatesPage.displayName = "CertificatesPage";
export default CertificatesPage;
