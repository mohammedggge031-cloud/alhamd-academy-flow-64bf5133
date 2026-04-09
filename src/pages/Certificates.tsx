import { useState, useRef, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, Printer, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CERT_TEMPLATES = [
  { id: "appreciation", labelAr: "شهادة تقدير وانضباط", labelEn: "Appreciation & Discipline" },
  { id: "completion", labelAr: "شهادة إتمام الحفظ", labelEn: "Quran Completion" },
  { id: "excellence", labelAr: "شهادة تفوق", labelEn: "Excellence Certificate" },
];

const generateCertNumber = () => `CERT-${String(Math.floor(Math.random() * 90000) + 10000)}`;

const CertificatesPage = memo(() => {
  const { t, lang } = useLanguage();
  const { session, isAuthReady, role } = useAuth();
  const { toast } = useToast();
  const queryEnabled = isAuthReady && !!session?.user;
  const previewRef = useRef<HTMLDivElement>(null);

  // Load Amiri font for Arabic certificate rendering
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
  const [customText, setCustomText] = useState("");
  const [certDate] = useState(new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }));
  const [certNumber] = useState(generateCertNumber);
  const [showPreview, setShowPreview] = useState(false);

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

  const templateConfig = CERT_TEMPLATES.find((t) => t.id === template)!;
  const certTitle = lang === "ar" ? templateConfig.labelAr : templateConfig.labelEn;

  const defaultText =
    template === "appreciation"
      ? `تقديراً لجهوده/ا المتميزة وانضباطه/ا المشهود في حلقات تحفيظ القرآن الكريم.\nسائلين المولى عزوجل له/ا ولأهله/ا دوام التوفيق والسداد.`
      : template === "completion"
      ? `لإتمامه/ا حفظ القرآن الكريم كاملاً بتوفيق من الله.\nنسأل الله أن يجعله حجة له لا عليه.`
      : `تقديراً لتفوقه/ا الملحوظ في الدراسة والأداء المتميز.\nنسأل الله أن يبارك في علمه وعمله.`;

  const bodyText = customText || defaultText;

  const handlePrint = useCallback(() => {
    if (!selectedStudent) {
      toast({ title: lang === "ar" ? "اختر طالباً أولاً" : "Select a student first", variant: "destructive" });
      return;
    }
    const el = previewRef.current;
    if (!el) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Amiri', serif; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#fff; }
        @media print { body { background:transparent; } }
      </style></head><body>${el.innerHTML}</body></html>
    `);
    printWin.document.close();
    setTimeout(() => { printWin.print(); printWin.close(); }, 500);
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
          {lang === "ar" ? "تصميم وطباعة شهادات تقدير احترافية للطلاب" : "Design and print professional certificates for students"}
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
                <SelectTrigger>
                  <SelectValue placeholder={lang === "ar" ? "اختر الطالب" : "Select student"} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{lang === "ar" ? "نوع الشهادة" : "Certificate Type"}</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CERT_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {lang === "ar" ? t.labelAr : t.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{lang === "ar" ? "نص مخصص (اختياري)" : "Custom Text (optional)"}</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
                placeholder={lang === "ar" ? "اترك فارغاً لاستخدام النص الافتراضي" : "Leave empty for default text"}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => setShowPreview(true)}
                disabled={!selectedStudent}
              >
                <Eye className="h-4 w-4" />
                {lang === "ar" ? "معاينة" : "Preview"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handlePrint}
                disabled={!selectedStudent}
              >
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
            <div ref={previewRef} className="mx-auto" style={{ maxWidth: 700 }}>
              <div
                dir="rtl"
                style={{
                  width: "100%",
                  aspectRatio: "1.414",
                  background: "linear-gradient(135deg, #fefce8 0%, #fff 50%, #fef3c7 100%)",
                  border: "8px double #b8860b",
                  borderRadius: 12,
                  padding: "clamp(16px, 4vw, 48px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "clamp(8px, 2vw, 20px)",
                  fontFamily: "'Amiri', serif",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Corner decorations */}
                <div style={{ position: "absolute", top: 16, left: 16, fontSize: 28, opacity: 0.15 }}>❋</div>
                <div style={{ position: "absolute", top: 16, right: 16, fontSize: 28, opacity: 0.15 }}>❋</div>
                <div style={{ position: "absolute", bottom: 16, left: 16, fontSize: 28, opacity: 0.15 }}>❋</div>
                <div style={{ position: "absolute", bottom: 16, right: 16, fontSize: 28, opacity: 0.15 }}>❋</div>

                {/* Academy name */}
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 700, color: "#1a5276" }}>
                    أكاديمية الحمد
                  </p>
                  <p style={{ fontSize: "clamp(10px, 1.5vw, 14px)", color: "#666", marginTop: 2 }}>
                    لتعليم القرآن والعربية
                  </p>
                </div>

                {/* Certificate type */}
                <div
                  style={{
                    background: "#1a5276",
                    color: "#fff",
                    padding: "6px 28px",
                    borderRadius: 20,
                    fontSize: "clamp(12px, 2vw, 18px)",
                    fontWeight: 700,
                  }}
                >
                  {certTitle}
                </div>

                {/* Body */}
                <p style={{ fontSize: "clamp(12px, 1.8vw, 16px)", color: "#333", textAlign: "center" }}>
                  تتشرف إدارة الأكاديمية بمنح هذه الشهادة للطالب/ة:
                </p>

                {/* Student name */}
                <p
                  style={{
                    fontSize: "clamp(20px, 3.5vw, 36px)",
                    fontWeight: 700,
                    color: "#b8860b",
                    borderBottom: "2px dotted #b8860b",
                    paddingBottom: 4,
                    minWidth: "60%",
                    textAlign: "center",
                  }}
                >
                  {selectedStudentName || ".................."}
                </p>

                {/* Text */}
                <p
                  style={{
                    fontSize: "clamp(11px, 1.6vw, 15px)",
                    color: "#555",
                    textAlign: "center",
                    lineHeight: 1.8,
                    maxWidth: "85%",
                    whiteSpace: "pre-line",
                  }}
                >
                  {bodyText}
                </p>

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "85%",
                    marginTop: "auto",
                    fontSize: "clamp(9px, 1.3vw, 12px)",
                    color: "#888",
                  }}
                >
                  <span>تاريخ الإصدار: {certDate}</span>
                  <span>الرقم المرجعي: {certNumber}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

CertificatesPage.displayName = "CertificatesPage";
export default CertificatesPage;
