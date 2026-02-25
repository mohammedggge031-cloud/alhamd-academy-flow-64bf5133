import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User, Upload, FileText, Trash2, Loader2, CheckCircle, Camera, CreditCard, Award, BookOpen,
} from "lucide-react";

const DOC_TYPES = [
  { key: "profile_photo", icon: Camera, labelKey: "profilePhoto" as const },
  { key: "id_card", icon: CreditCard, labelKey: "idCard" as const },
  { key: "certificate", icon: Award, labelKey: "certificate" as const },
  { key: "ijaza", icon: BookOpen, labelKey: "ijazaDoc" as const },
  { key: "other", icon: FileText, labelKey: "otherDoc" as const },
] as const;

const TeacherProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  // Fetch teacher record
  const { data: teacher, isLoading } = useQuery({
    queryKey: ["my-teacher-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*, profiles!teachers_user_id_fkey(full_name, whatsapp)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ["my-teacher-documents", teacher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_documents")
        .select("*")
        .eq("teacher_id", teacher!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teacher?.id,
  });

  // Update profile info
  const updateProfile = useMutation({
    mutationFn: async (updates: { bio?: string; academic_degree?: string; ijazat?: string; qualification?: string }) => {
      const { error } = await supabase
        .from("teachers")
        .update({ ...updates, profile_completed: true })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-teacher-profile"] });
      toast({ title: t("success"), description: t("profileUpdated") });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  // Upload file
  const handleUpload = async (file: File, docType: string, description?: string) => {
    if (!teacher || !user) return;
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-files")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("teacher-files")
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("teacher_documents")
        .insert({
          teacher_id: teacher.id,
          document_type: docType,
          file_url: urlData.publicUrl,
          file_name: file.name,
          description: description || null,
        });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["my-teacher-documents"] });
      toast({ title: t("success"), description: t("fileUploaded") });
    } catch (err: any) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  // Delete document
  const deleteDoc = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("teacher_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-teacher-documents"] });
      toast({ title: t("deleted") });
    },
  });

  // Form state
  const [form, setForm] = useState<{
    bio: string; academic_degree: string; ijazat: string; qualification: string;
  } | null>(null);

  const currentForm = form ?? {
    bio: teacher?.bio ?? "",
    academic_degree: teacher?.academic_degree ?? "",
    ijazat: teacher?.ijazat ?? "",
    qualification: teacher?.qualification ?? "",
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher) {
    return <p className="text-center text-muted-foreground py-12">{t("teacherNotFound")}</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <User className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t("myProfile")}</h1>
        {teacher.profile_completed && (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" /> {t("profileComplete")}
          </Badge>
        )}
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("fullName")}</Label>
              <p className="text-sm font-medium mt-1">{(teacher as any).profiles?.full_name}</p>
            </div>
            <div>
              <Label>{t("whatsapp")}</Label>
              <p className="text-sm font-medium mt-1 dir-ltr" dir="ltr">{(teacher as any).profiles?.whatsapp}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label>{t("academicDegree")}</Label>
              <Input
                placeholder={t("academicDegreePlaceholder")}
                value={currentForm.academic_degree}
                onChange={(e) => setForm({ ...currentForm, academic_degree: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("qualification")}</Label>
              <Input
                placeholder={t("qualificationPlaceholder")}
                value={currentForm.qualification}
                onChange={(e) => setForm({ ...currentForm, qualification: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("ijazatLabel")}</Label>
              <Input
                placeholder={t("ijazatPlaceholder")}
                value={currentForm.ijazat}
                onChange={(e) => setForm({ ...currentForm, ijazat: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("bioLabel")}</Label>
              <Textarea
                placeholder={t("bioPlaceholder")}
                value={currentForm.bio}
                rows={4}
                onChange={(e) => setForm({ ...currentForm, bio: e.target.value })}
              />
            </div>
          </div>

          <Button
            onClick={() => updateProfile.mutate(currentForm)}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("saveProfile")}
          </Button>
        </CardContent>
      </Card>

      {/* Documents Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("documentsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {DOC_TYPES.map(({ key, icon: Icon, labelKey }) => {
            const docs = documents.filter((d: any) => d.document_type === key);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <Label className="font-medium">{t(labelKey)}</Label>
                </div>

                {docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    {doc.file_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <img src={doc.file_url} alt={doc.file_name} className="h-16 w-16 rounded object-cover" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteDoc.mutate(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  {uploading === key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">{t("uploadFile")}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, key);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherProfile;
