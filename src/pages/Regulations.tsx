import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollText, Plus, Pencil, Trash2, GripVertical, Loader2, Save, X, Languages } from "lucide-react";
import logo from "@/assets/logo.jpeg";
import ConfirmDialog from "@/components/ConfirmDialog";

interface RegulationSection {
  id: string;
  section_title: string;
  section_title_en?: string;
  section_order: number;
  items: string[];
  items_en?: string[];
}

const Regulations = () => {
  const { role } = useAuth();
  const { t, lang: siteLang } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  // Independent language toggle for regulations, defaults to site language
  const [regLang, setRegLang] = useState<"ar" | "en">("ar");
  const hasInitializedRegLang = useRef(false);

  const [editSection, setEditSection] = useState<RegulationSection | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newSectionDialog, setNewSectionDialog] = useState(false);
  const [newSection, setNewSection] = useState({ title: "", title_en: "", items: "", items_en: "" });

  useEffect(() => {
    if (!hasInitializedRegLang.current) {
      hasInitializedRegLang.current = true;
      return;
    }

    setRegLang(siteLang === "en" ? "en" : "ar");
  }, [siteLang]);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["regulations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regulations")
        .select("*")
        .order("section_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        ...s,
        items: Array.isArray(s.items) ? s.items : JSON.parse(s.items || "[]"),
        items_en: Array.isArray(s.items_en) ? s.items_en : (s.items_en ? JSON.parse(s.items_en) : []),
        section_title_en: s.section_title_en || "",
      })) as RegulationSection[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (section: RegulationSection) => {
      const { error } = await supabase
        .from("regulations")
        .update({
          section_title: section.section_title,
          section_title_en: section.section_title_en || "",
          items: section.items as any,
          items_en: (section.items_en || []) as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", section.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulations"] });
      setEditDialog(false);
      setEditSection(null);
      toast({ title: t("success") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.section_order)) : 0;
      const items = newSection.items.split("\n").filter(i => i.trim());
      const items_en = newSection.items_en.split("\n").filter(i => i.trim());
      const { error } = await supabase.from("regulations").insert({
        section_title: newSection.title,
        section_title_en: newSection.title_en,
        section_order: maxOrder + 1,
        items: items as any,
        items_en: items_en as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulations"] });
      setNewSectionDialog(false);
      setNewSection({ title: "", title_en: "", items: "", items_en: "" });
      toast({ title: t("success") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("regulations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulations"] });
      toast({ title: t("success") });
    },
    onError: (err: Error) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
  });

  let globalItemIndex = 0;

  const openEdit = (section: RegulationSection) => {
    setEditSection({ ...section, items: [...section.items], items_en: [...(section.items_en || [])] });
    setEditDialog(true);
  };

  const updateEditItem = (idx: number, value: string, lang: "ar" | "en") => {
    if (!editSection) return;
    if (lang === "ar") {
      const items = [...editSection.items];
      items[idx] = value;
      setEditSection({ ...editSection, items });
    } else {
      const items_en = [...(editSection.items_en || [])];
      items_en[idx] = value;
      setEditSection({ ...editSection, items_en });
    }
  };

  const addEditItem = () => {
    if (!editSection) return;
    setEditSection({
      ...editSection,
      items: [...editSection.items, ""],
      items_en: [...(editSection.items_en || []), ""],
    });
  };

  const removeEditItem = (idx: number) => {
    if (!editSection) return;
    setEditSection({
      ...editSection,
      items: editSection.items.filter((_, i) => i !== idx),
      items_en: (editSection.items_en || []).filter((_, i) => i !== idx),
    });
  };

  const isAr = regLang === "ar";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Alhamd Academy" width="64" height="64" className="h-16 w-16 rounded-xl object-contain bg-white p-1 shadow-md" loading="eager" decoding="async" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {isAr ? "اللائحة التنظيمية" : "Academy Regulations"}
              </h1>
              <p className="text-white/80 text-sm md:text-base">
                {isAr ? "لمعلمي ومعلمات أكاديمية الحمد" : "For Alhamd Academy Teachers"}
              </p>
            </div>
          </div>
          {/* Language toggle */}
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
            onClick={() => setRegLang(isAr ? "en" : "ar")}
          >
            <Languages className="h-4 w-4" />
            {isAr ? "English" : "عربي"}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <ScrollText className="h-4 w-4" />
          <span>
            {isAr
              ? `${sections.length} أقسام • ${sections.reduce((a, s) => a + s.items.length, 0)} بند`
              : `${sections.length} sections • ${sections.reduce((a, s) => a + s.items.length, 0)} articles`}
          </span>
        </div>
      </div>

      {/* Admin: Add section */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setNewSectionDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {isAr ? "إضافة قسم جديد" : "Add New Section"}
          </Button>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        const title = isAr ? section.section_title : (section.section_title_en || section.section_title);
        const items = isAr ? section.items : (section.items_en?.length ? section.items_en : section.items);

        return (
          <Card key={section.id} className="border-none shadow-sm overflow-hidden">
            <div className="bg-primary/5 border-b px-5 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-primary/40" />
                {title}
              </h2>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => openEdit(section)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(section.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <CardContent className="p-5 space-y-3">
              {items.map((item, idx) => {
                globalItemIndex++;
                const currentNumber = globalItemIndex;
                const lines = item.split("\n");
                return (
                  <div key={idx} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mt-0.5">
                      {currentNumber}
                    </span>
                    <div className="flex-1 text-sm leading-relaxed text-foreground/90">
                      {lines.map((line, li) => (
                        <p key={li} className={li > 0 ? "text-muted-foreground" : "font-medium"}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t">
        <p>
          {isAr
            ? `أكاديمية الحمد © ${new Date().getFullYear()} — جميع الحقوق محفوظة`
            : `Alhamd Academy © ${new Date().getFullYear()} — All Rights Reserved`}
        </p>
      </div>

      {/* Edit Section Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل القسم</DialogTitle>
          </DialogHeader>
          {editSection && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">العنوان (عربي)</label>
                  <Input
                    value={editSection.section_title}
                    onChange={(e) => setEditSection({ ...editSection, section_title: e.target.value })}
                    placeholder="عنوان القسم"
                    className="font-bold"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title (English)</label>
                  <Input
                    value={editSection.section_title_en || ""}
                    onChange={(e) => setEditSection({ ...editSection, section_title_en: e.target.value })}
                    placeholder="Section title"
                    className="font-bold"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {editSection.items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-bold">بند {idx + 1}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEditItem(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={item}
                      onChange={(e) => updateEditItem(idx, e.target.value, "ar")}
                      rows={2}
                      className="text-sm"
                      dir="rtl"
                      placeholder="النص العربي..."
                    />
                    <Textarea
                      value={(editSection.items_en || [])[idx] || ""}
                      onChange={(e) => updateEditItem(idx, e.target.value, "en")}
                      rows={2}
                      className="text-sm"
                      dir="ltr"
                      placeholder="English text..."
                    />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addEditItem} className="gap-1 w-full">
                <Plus className="h-3 w-3" />
                إضافة بند
              </Button>
              <Button className="w-full gap-2" onClick={() => saveMutation.mutate(editSection)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ التعديلات
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Section Dialog */}
      <Dialog open={newSectionDialog} onOpenChange={setNewSectionDialog}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة قسم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={newSection.title}
                onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                placeholder="عنوان القسم (عربي)"
                dir="rtl"
              />
              <Input
                value={newSection.title_en}
                onChange={(e) => setNewSection({ ...newSection, title_en: e.target.value })}
                placeholder="Section title (English)"
                dir="ltr"
              />
            </div>
            <Textarea
              value={newSection.items}
              onChange={(e) => setNewSection({ ...newSection, items: e.target.value })}
              placeholder="اكتب كل بند عربي في سطر منفصل..."
              rows={4}
              dir="rtl"
            />
            <Textarea
              value={newSection.items_en}
              onChange={(e) => setNewSection({ ...newSection, items_en: e.target.value })}
              placeholder="Write each English article on a separate line..."
              rows={4}
              dir="ltr"
            />
            <Button className="w-full gap-2" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !newSection.title}>
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة القسم
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("delete")}
        description={isAr ? "هل أنت متأكد من حذف هذا القسم؟" : "Are you sure you want to delete this section?"}
        confirmLabel={t("delete")}
        variant="destructive"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default Regulations;
