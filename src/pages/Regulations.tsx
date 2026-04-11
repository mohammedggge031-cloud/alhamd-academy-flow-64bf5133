import { useState } from "react";
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
import { ScrollText, Plus, Pencil, Trash2, GripVertical, Loader2, Save, X } from "lucide-react";
import logo from "@/assets/logo.jpeg";
import ConfirmDialog from "@/components/ConfirmDialog";

interface RegulationSection {
  id: string;
  section_title: string;
  section_order: number;
  items: string[];
}

const Regulations = () => {
  const { role } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  const [editSection, setEditSection] = useState<RegulationSection | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newSectionDialog, setNewSectionDialog] = useState(false);
  const [newSection, setNewSection] = useState({ title: "", items: "" });

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
      })) as RegulationSection[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (section: RegulationSection) => {
      const { error } = await supabase
        .from("regulations")
        .update({
          section_title: section.section_title,
          items: section.items as any,
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
      const { error } = await supabase.from("regulations").insert({
        section_title: newSection.title,
        section_order: maxOrder + 1,
        items: items as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulations"] });
      setNewSectionDialog(false);
      setNewSection({ title: "", items: "" });
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

  // Global item counter across all sections
  let globalItemIndex = 0;

  const openEdit = (section: RegulationSection) => {
    setEditSection({ ...section, items: [...section.items] });
    setEditDialog(true);
  };

  const updateEditItem = (idx: number, value: string) => {
    if (!editSection) return;
    const items = [...editSection.items];
    items[idx] = value;
    setEditSection({ ...editSection, items });
  };

  const addEditItem = () => {
    if (!editSection) return;
    setEditSection({ ...editSection, items: [...editSection.items, ""] });
  };

  const removeEditItem = (idx: number) => {
    if (!editSection) return;
    setEditSection({ ...editSection, items: editSection.items.filter((_, i) => i !== idx) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <img src={logo} alt="Alhamd Academy" className="h-16 w-16 rounded-xl border-2 border-white/30 object-contain bg-white/10 p-1" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">اللائحة التنظيمية</h1>
            <p className="text-white/80 text-sm md:text-base">لمعلمي ومعلمات أكاديمية الحمد</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <ScrollText className="h-4 w-4" />
          <span>{sections.length} أقسام • {sections.reduce((a, s) => a + s.items.length, 0)} بند</span>
        </div>
      </div>

      {/* Admin: Add section */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setNewSectionDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة قسم جديد
          </Button>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => (
        <Card key={section.id} className="border-none shadow-sm overflow-hidden">
          <div className="bg-primary/5 border-b px-5 py-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-primary/40" />
              {section.section_title}
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
            {section.items.map((item, idx) => {
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
                      <p key={li} className={li > 0 ? "mr-2 text-muted-foreground" : "font-medium"}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t">
        <p>أكاديمية الحمد © {new Date().getFullYear()} — جميع الحقوق محفوظة</p>
      </div>

      {/* Edit Section Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل القسم</DialogTitle>
          </DialogHeader>
          {editSection && (
            <div className="space-y-4">
              <Input
                value={editSection.section_title}
                onChange={(e) => setEditSection({ ...editSection, section_title: e.target.value })}
                placeholder="عنوان القسم"
                className="font-bold"
              />
              <div className="space-y-2">
                {editSection.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-xs text-muted-foreground mt-3 w-6 text-center">{idx + 1}</span>
                    <Textarea
                      value={item}
                      onChange={(e) => updateEditItem(idx, e.target.value)}
                      rows={2}
                      className="flex-1 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0 mt-1" onClick={() => removeEditItem(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة قسم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newSection.title}
              onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
              placeholder="عنوان القسم (مثال: تاسعًا: قواعد إضافية)"
            />
            <Textarea
              value={newSection.items}
              onChange={(e) => setNewSection({ ...newSection, items: e.target.value })}
              placeholder="اكتب كل بند في سطر منفصل..."
              rows={5}
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
        description="هل أنت متأكد من حذف هذا القسم؟"
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
