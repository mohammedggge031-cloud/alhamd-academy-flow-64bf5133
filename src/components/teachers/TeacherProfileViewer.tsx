import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Camera, CreditCard, Award, BookOpen, CheckCircle, ExternalLink } from "lucide-react";

const DOC_TYPE_ICONS: Record<string, any> = {
  profile_photo: Camera,
  id_card: CreditCard,
  certificate: Award,
  ijaza: BookOpen,
  other: FileText,
};

const DOC_TYPE_LABELS: Record<string, string> = {
  profile_photo: "profilePhoto",
  id_card: "idCard",
  certificate: "certificate",
  ijaza: "ijazaDoc",
  other: "otherDoc",
};

interface Props {
  teacherId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TeacherProfileViewer = ({ teacherId, open, onOpenChange }: Props) => {
  const { t } = useLanguage();

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["admin-teacher-profile", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*, profiles!teachers_profile_user_id_fkey(full_name, whatsapp)")
        .eq("id", teacherId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId && open,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["admin-teacher-documents", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_documents")
        .select("*")
        .eq("teacher_id", teacherId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("teacherProfileTitle")}
            {teacher?.profile_completed && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" /> {t("profileComplete")}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : teacher ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("fullName")}:</span>
                <p className="font-medium">{(teacher as any).profiles?.full_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("whatsapp")}:</span>
                <p className="font-medium" dir="ltr">{(teacher as any).profiles?.whatsapp}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("academicDegree")}:</span>
                <p className="font-medium">{teacher.academic_degree || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("qualification")}:</span>
                <p className="font-medium">{teacher.qualification || "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">{t("ijazatLabel")}:</span>
                <p className="font-medium">{teacher.ijazat || "—"}</p>
              </div>
              {teacher.bio && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t("bioLabel")}:</span>
                  <p className="font-medium whitespace-pre-wrap">{teacher.bio}</p>
                </div>
              )}
            </div>

            {/* Subjects */}
            {teacher.subjects && teacher.subjects.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">{t("subjects")}:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {teacher.subjects.map((s: string) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm border-b pb-1">{t("documentsTitle")}</h3>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
              ) : (
                <div className="grid gap-3">
                  {documents.map((doc: any) => {
                    const Icon = DOC_TYPE_ICONS[doc.document_type] || FileText;
                    return (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        {doc.file_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={doc.file_url} alt={doc.file_name} loading="lazy" className="h-20 w-20 rounded object-cover hover:opacity-80 transition" />
                          </a>
                        ) : (
                          <Icon className="h-8 w-8 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{t(DOC_TYPE_LABELS[doc.document_type] as any)}</Badge>
                          </div>
                          <p className="text-sm font-medium truncate mt-1">{doc.file_name}</p>
                          {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                        </div>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-70">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
