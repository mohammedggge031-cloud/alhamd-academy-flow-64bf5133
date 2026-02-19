import { useState, useEffect } from "react";
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
import AddStudentForm from "@/components/students/AddStudentForm";
import StudentCard from "@/components/students/StudentCard";
import TransferStudentDialog from "@/components/students/TransferStudentDialog";
import { useLanguage } from "@/i18n/LanguageContext";

const Students = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [invoiceStatuses, setInvoiceStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [transferStudent, setTransferStudent] = useState<any>(null);
  const { t } = useLanguage();

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data) {
      setStudents(data);

      const teacherIds = [...new Set(data.map((s) => s.assigned_teacher_id).filter(Boolean))];
      const names: Record<string, string> = {};
      for (const tid of teacherIds) {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("user_id")
          .eq("id", tid)
          .maybeSingle();
        if (teacher) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", teacher.user_id)
            .maybeSingle();
          names[tid] = profile?.full_name || t("teacher");
        }
      }
      setTeacherNames(names);

      const statuses: Record<string, string> = {};
      for (const s of data) {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("status")
          .eq("student_id", s.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (invoice) statuses[s.id] = invoice.status;
      }
      setInvoiceStatuses(statuses);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name?.includes(search) ||
      s.whatsapp?.includes(search) ||
      s.country?.includes(search)
  );

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
                fetchStudents();
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

      {loading ? (
        <p className="text-center text-muted-foreground py-8">{t("loadingStudents")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("noStudents")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              teacherName={teacherNames[student.assigned_teacher_id] || t("noTeacher")}
              invoiceStatus={invoiceStatuses[student.id] || null}
              onTransfer={() => setTransferStudent(student)}
            />
          ))}
        </div>
      )}

      {transferStudent && (
        <TransferStudentDialog
          open={!!transferStudent}
          onOpenChange={(open) => !open && setTransferStudent(null)}
          studentId={transferStudent.id}
          studentName={transferStudent.name}
          currentTeacherId={transferStudent.assigned_teacher_id}
          studentSchedule={Array.isArray(transferStudent.schedule) ? transferStudent.schedule : []}
          onSuccess={fetchStudents}
        />
      )}
    </div>
  );
};

export default Students;
