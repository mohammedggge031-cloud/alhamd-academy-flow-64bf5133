import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "@/components/PaginationControls";
import { Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AddStudentForm from "@/components/students/AddStudentForm";
import EditStudentForm from "@/components/students/EditStudentForm";
import StudentCard from "@/components/students/StudentCard";
import TransferStudentDialog from "@/components/students/TransferStudentDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const Students = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<any>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [deleteStudent, setDeleteStudent] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Open dialog automatically when ?action=add is present
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setDialogOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ["students-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("*, assigned_teacher:assigned_teacher_id(id, user_id, profiles:user_id(full_name))")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const studentIds = students.map((s: any) => s.id);

  const { data: invoiceStatuses = {} } = useQuery({
    queryKey: ["student-invoice-statuses", studentIds],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("student_id, status, created_at")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });
      
      const statuses: Record<string, string> = {};
      if (data) {
        for (const inv of data) {
          if (inv.student_id && !statuses[inv.student_id]) {
            statuses[inv.student_id] = inv.status;
          }
        }
      }
      return statuses;
    },
  });

  const getTeacherName = (student: any) => {
    return student.assigned_teacher?.profiles?.full_name || t("noTeacher");
  };

  const filtered = students.filter(
    (s: any) => {
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) ||
        s.whatsapp?.includes(search) ||
        s.country?.toLowerCase().includes(q);
    }
  );

  const { page, setPage, totalPages, paginatedItems, totalItems, hasNext, hasPrev } = usePagination(filtered, { pageSize: 50 });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {t("studentsTitle")}
          </h1>
          <p className="text-muted-foreground">{students.length} {t("studentsRegistered")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("addStudent")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("addStudentTitle")}</DialogTitle>
            </DialogHeader>
            <AddStudentForm
              onSuccess={() => {
                setDialogOpen(false);
                refetch();
              }}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchStudents")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">{t("loadingStudents")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("noStudents")}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedItems.map((student: any) => (
              <StudentCard
                key={student.id}
                student={student}
                teacherName={getTeacherName(student)}
                invoiceStatus={(invoiceStatuses as Record<string, string>)[student.id] || null}
                onTransfer={() => setTransferStudent(student)}
                onEdit={() => setEditStudent(student)}
                onDelete={() => setDeleteStudent(student)}
              />
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} hasNext={hasNext} hasPrev={hasPrev} />
        </>
      )}

      {transferStudent && (
        <TransferStudentDialog
          open={!!transferStudent}
          onOpenChange={(open) => !open && setTransferStudent(null)}
          studentId={transferStudent.id}
          studentName={transferStudent.name}
          currentTeacherId={transferStudent.assigned_teacher_id}
          studentSchedule={Array.isArray(transferStudent.schedule) ? transferStudent.schedule : []}
          onSuccess={() => refetch()}
        />
      )}

      <Dialog open={!!editStudent} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editStudent")}</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <EditStudentForm
              student={editStudent}
              onSuccess={() => { setEditStudent(null); refetch(); }}
              onCancel={() => setEditStudent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteStudent}
        onOpenChange={(open) => !open && !deleting && setDeleteStudent(null)}
        title={t("deleteStudent")}
        description={t("confirmDeleteStudent")}
        variant="destructive"
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        isPending={deleting}
        onConfirm={async () => {
          if (!deleteStudent) return;
          setDeleting(true);
          const { error } = await supabase
            .from("students")
            .update({ is_active: false })
            .eq("id", deleteStudent.id);
          setDeleting(false);
          if (error) {
            toast({ title: t("error"), description: error.message, variant: "destructive" });
          } else {
            toast({ title: t("success"), description: t("studentDeleted") });
            setDeleteStudent(null);
            refetch();
          }
        }}
      />
    </div>
  );
};

export default Students;
