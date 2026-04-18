import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, User, Camera, GraduationCap, Award, BookOpen, FileText, Tags, Users } from "lucide-react";

const VISIBLE_FIELDS = [
  { key: "name", icon: User, labelKey: "fullName" as const },
  { key: "photo", icon: Camera, labelKey: "profilePhoto" as const },
  { key: "qualification", icon: GraduationCap, labelKey: "qualification" as const },
  { key: "academic_degree", icon: Award, labelKey: "academicDegree" as const },
  { key: "ijazat", icon: BookOpen, labelKey: "ijazatLabel" as const },
  { key: "bio", icon: FileText, labelKey: "bioLabel" as const },
  { key: "subjects", icon: Tags, labelKey: "subjects" as const },
  { key: "gender", icon: Users, labelKey: "gender" as const },
] as const;

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
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(showOnWebsite);
  const [fields, setFields] = useState<string[]>(visibleFields);

  useEffect(() => {
    setEnabled(showOnWebsite);
    setFields(visibleFields);
  }, [showOnWebsite, visibleFields, open]);

  const toggleField = (key: string) => {
    setFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("teachers")
        .update({
          show_on_website: enabled,
          website_visible_fields: enabled ? fields : [],
        })
        .eq("id", teacherId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({ title: t("success"), description: t("websiteSettingsSaved") });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("websiteVisibility")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-sm">{teacherName}</p>
              <p className="text-xs text-muted-foreground">{t("showOnWebsite")}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{t("selectVisibleFields")}</p>
              {VISIBLE_FIELDS.map(({ key, icon: Icon, labelKey }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={fields.includes(key)}
                    onCheckedChange={() => toggleField(key)}
                  />
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm">{t(labelKey)}</span>
                </label>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
