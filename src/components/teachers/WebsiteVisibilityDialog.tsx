import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Globe, Loader2, Sparkles, RefreshCw } from "lucide-react";

const VISIBLE_FIELDS = [
  "name", "photo", "qualification", "academic_degree",
  "ijazat", "bio", "about", "subjects", "gender",
] as const;

const TRANSLATION_STATUS_COLORS: Record<string, string> = {
  not_generated: "bg-slate-200 text-slate-700",
  generated: "bg-blue-100 text-blue-700",
  manually_edited: "bg-emerald-100 text-emerald-700",
  needs_regeneration: "bg-amber-100 text-amber-800",
};

interface Props {
  teacherId: string;
  teacherName: string;
  showOnWebsite: boolean;
  visibleFields: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WebsiteVisibilityDialog = ({
  teacherId, teacherName, showOnWebsite, visibleFields, open, onOpenChange,
}: Props) => {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(showOnWebsite);
  const [showAr, setShowAr] = useState(false);
  const [showEn, setShowEn] = useState(true);
  const [fields, setFields] = useState<string[]>(visibleFields);

  const [jobTitleEn, setJobTitleEn] = useState("");
  const [jobTitleAr, setJobTitleAr] = useState("");
  const [bioEn, setBioEn] = useState("");
  const [bioAr, setBioAr] = useState("");
  const [translationStatus, setTranslationStatus] = useState<string>("not_generated");
  const [initialAr, setInitialAr] = useState({ title: "", bio: "" });

  const [country, setCountry] = useState("");
  const [languages, setLanguages] = useState("");
  const [audience, setAudience] = useState("");
  const [specs, setSpecs] = useState("");
  const [experience, setExperience] = useState<string>("");
  const [displayOrder, setDisplayOrder] = useState<string>("0");
  const [isFeatured, setIsFeatured] = useState(false);

  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("id", teacherId)
        .maybeSingle();
      if (!data) return;
      const d = data as any;
      setEnabled(!!d.show_on_website);
      setShowAr(!!d.show_on_arabic_website);
      setShowEn(!!d.show_on_english_website);
      setFields(d.website_visible_fields || []);
      setJobTitleEn(d.job_title_en || "");
      setJobTitleAr(d.job_title_ar || "");
      setBioEn(d.bio_en || d.bio || "");
      setBioAr(d.bio_ar || "");
      setInitialAr({ title: d.job_title_ar || "", bio: d.bio_ar || "" });
      setTranslationStatus(d.translation_status || "not_generated");
      setCountry(d.country || "");
      setLanguages((d.languages || []).join(", "));
      setAudience((d.teaching_audience || []).join(", "));
      setSpecs((d.specializations || []).join(", "));
      setExperience(d.experience_years?.toString() || "");
      setDisplayOrder((d.display_order ?? 0).toString());
      setIsFeatured(!!d.is_featured);
    })();
  }, [open, teacherId]);

  const toggleField = (key: string) => {
    setFields((prev) => prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]);
  };

  const parseArray = (s: string) =>
    s.split(",").map((x) => x.trim()).filter(Boolean);

  const generateArabic = async () => {
    if (!jobTitleEn && !bioEn) {
      toast({ title: "English content required", description: "Fill English fields first.", variant: "destructive" });
      return;
    }
    setTranslating(true);
    try {
      const results = await Promise.all([
        jobTitleEn ? supabase.functions.invoke("ai-translate", { body: { text: jobTitleEn, from: "en", to: "ar" } }) : null,
        bioEn ? supabase.functions.invoke("ai-translate", { body: { text: bioEn, from: "en", to: "ar" } }) : null,
      ]);
      if (results[0]?.data?.translated) setJobTitleAr(results[0].data.translated);
      if (results[1]?.data?.translated) setBioAr(results[1].data.translated);
      setTranslationStatus("generated");
      toast({ title: "Arabic version generated", description: "Review and save." });
    } catch (e: any) {
      toast({ title: "Translation failed", description: e.message, variant: "destructive" });
    } finally {
      setTranslating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // If Arabic differs from initial after generation → manually_edited
      let nextStatus = translationStatus;
      if (translationStatus === "generated" &&
          (jobTitleAr !== initialAr.title || bioAr !== initialAr.bio)) {
        nextStatus = "manually_edited";
      }

      const payload: any = {
        show_on_website: enabled,
        show_on_arabic_website: enabled ? showAr : false,
        show_on_english_website: enabled ? showEn : false,
        website_visible_fields: enabled ? fields : [],
        job_title_en: jobTitleEn || null,
        job_title_ar: jobTitleAr || null,
        bio_en: bioEn || null,
        bio_ar: bioAr || null,
        translation_status: nextStatus,
        country: country || null,
        languages: parseArray(languages),
        teaching_audience: parseArray(audience),
        specializations: parseArray(specs),
        experience_years: experience ? parseInt(experience, 10) : null,
        display_order: parseInt(displayOrder, 10) || 0,
        is_featured: isFeatured,
      };

      const { error } = await supabase.from("teachers").update(payload).eq("id", teacherId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({ title: t("success"), description: t("websiteSettingsSaved" as any) });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const requestRegenerate = () => {
    setTranslationStatus("needs_regeneration");
    toast({ title: "Marked for regeneration", description: "Click Generate Arabic to overwrite." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("websiteVisibility" as any)} — {teacherName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Publish controls */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Publishing</h3>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Show on Website (master)</p>
                  <p className="text-xs text-muted-foreground">Turns visibility on/off entirely.</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-between p-3 rounded-lg border ${!enabled ? "opacity-50" : ""}`}>
                  <span className="text-sm">Arabic Website</span>
                  <Switch checked={showAr} onCheckedChange={setShowAr} disabled={!enabled} />
                </label>
                <label className={`flex items-center justify-between p-3 rounded-lg border ${!enabled ? "opacity-50" : ""}`}>
                  <span className="text-sm">English Website</span>
                  <Switch checked={showEn} onCheckedChange={setShowEn} disabled={!enabled} />
                </label>
              </div>
            </section>

            <Separator />

            {/* Bilingual content */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Bilingual Content</h3>
                <Badge className={TRANSLATION_STATUS_COLORS[translationStatus] || ""}>
                  {translationStatus.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Job Title (EN) — primary</Label>
                <Input value={jobTitleEn} onChange={(e) => setJobTitleEn(e.target.value)} placeholder="Senior Quran Instructor" />
              </div>
              <div className="space-y-2">
                <Label>Bio (EN) — primary</Label>
                <Textarea value={bioEn} onChange={(e) => setBioEn(e.target.value)} rows={3} />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={generateArabic} disabled={translating}>
                  {translating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Sparkles className="h-4 w-4 ml-2" />}
                  Generate Arabic Version
                </Button>
                {translationStatus === "manually_edited" && (
                  <Button type="button" variant="ghost" size="sm" onClick={requestRegenerate}>
                    <RefreshCw className="h-4 w-4 ml-2" />
                    Mark for regeneration
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Job Title (AR)</Label>
                <Input value={jobTitleAr} onChange={(e) => setJobTitleAr(e.target.value)} dir="rtl" placeholder="مدرس قرآن أول" />
              </div>
              <div className="space-y-2">
                <Label>Bio (AR)</Label>
                <Textarea value={bioAr} onChange={(e) => setBioAr(e.target.value)} rows={3} dir="rtl" />
              </div>
            </section>

            <Separator />

            {/* Metadata */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Metadata</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="EG" />
                </div>
                <div className="space-y-2">
                  <Label>Experience (years)</Label>
                  <Input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
                </div>
                <label className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Featured Teacher</span>
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                </label>
              </div>
              <div className="space-y-2">
                <Label>Languages (comma separated)</Label>
                <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="ar, en, ur" />
              </div>
              <div className="space-y-2">
                <Label>Teaching Audience (comma separated)</Label>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="kids, adults, women" />
              </div>
              <div className="space-y-2">
                <Label>Specializations (comma separated)</Label>
                <Input value={specs} onChange={(e) => setSpecs(e.target.value)} placeholder="tajweed, hifz, arabic" />
              </div>
            </section>

            <Separator />

            {/* Fields visibility */}
            {enabled && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Fields visible on website</h3>
                <div className="grid grid-cols-2 gap-2">
                  {VISIBLE_FIELDS.map((key) => (
                    <label key={key} className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer text-sm">
                      <Checkbox checked={fields.includes(key)} onCheckedChange={() => toggleField(key)} />
                      <span className="capitalize">{key.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <Button
              className="w-full"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t("save" as any)}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
