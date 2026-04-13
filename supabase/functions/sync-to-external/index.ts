import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("غير مصرح");

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("غير مصرح");

    const callerId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: callerRole } = await adminClient
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!callerRole) throw new Error("المدير فقط يمكنه المزامنة");

    const targetDbUrl = Deno.env.get("TARGET_DATABASE_URL");
    if (!targetDbUrl) throw new Error("TARGET_DATABASE_URL غير محدد");

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "schema_and_data";

    // Connect to target database
    const pool = new Pool(targetDbUrl, 1, true);
    const conn = await pool.connect();

    const logs: string[] = [];
    const errors: string[] = [];

    try {
      // ======= STEP 1: Create enum =======
      try {
        await conn.queryObject(`DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','teacher','manager'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
        logs.push("✅ app_role enum ready");
      } catch (e) { errors.push(`enum: ${e.message}`); }

      // ======= STEP 2: Create tables =======
      const tableSQL = `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL UNIQUE,
          full_name text NOT NULL DEFAULT 'مستخدم جديد',
          whatsapp text,
          dot_color text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.user_roles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          role app_role NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(user_id, role)
        );

        CREATE TABLE IF NOT EXISTS public.teachers (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL UNIQUE,
          hourly_rate numeric NOT NULL DEFAULT 0,
          rate_currency text NOT NULL DEFAULT 'USD',
          qualification text,
          age integer,
          subjects text[] DEFAULT '{}',
          is_active boolean DEFAULT true,
          monthly_hours numeric DEFAULT 0,
          monthly_salary numeric DEFAULT 0,
          monthly_absence_hours numeric DEFAULT 0,
          monthly_waiting_minutes integer DEFAULT 0,
          students_count integer DEFAULT 0,
          rating numeric DEFAULT 0,
          bonus_amount numeric DEFAULT 0,
          bonus_reason text,
          zoom_link text,
          bio text,
          show_on_website boolean DEFAULT false,
          website_visible_fields text[] DEFAULT '{}',
          gender text DEFAULT 'male',
          profile_completed boolean DEFAULT false,
          ijazat text,
          academic_degree text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.students (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          age integer,
          whatsapp text,
          guardian_whatsapp text,
          assigned_teacher_id uuid,
          remaining_hours numeric DEFAULT 0,
          paid_hours numeric DEFAULT 0,
          attended_hours numeric DEFAULT 0,
          absence_hours numeric DEFAULT 0,
          timezone text DEFAULT 'Africa/Cairo',
          country text,
          schedule jsonb DEFAULT '[]',
          session_duration_minutes integer DEFAULT 60,
          is_active boolean DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          teacher_id uuid NOT NULL,
          student_id uuid NOT NULL,
          session_date date NOT NULL,
          start_time time,
          duration_minutes integer NOT NULL DEFAULT 60,
          status text NOT NULL DEFAULT 'upcoming',
          waiting_minutes integer DEFAULT 0,
          exception_minutes integer DEFAULT 0,
          notes text,
          teacher_paid boolean DEFAULT true,
          pending_approval boolean DEFAULT false,
          original_data jsonb,
          approval_status text DEFAULT 'none',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.invoices (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id uuid,
          amount numeric NOT NULL,
          total numeric NOT NULL,
          discount numeric DEFAULT 0,
          hours numeric DEFAULT 0,
          status text NOT NULL DEFAULT 'pending',
          due_date date,
          paid_at timestamptz,
          notes text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.invoice_students (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id uuid NOT NULL,
          student_id uuid NOT NULL,
          hours numeric NOT NULL DEFAULT 0,
          amount numeric NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.expenses (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          description text NOT NULL,
          category text NOT NULL,
          amount numeric NOT NULL DEFAULT 0,
          expense_month date NOT NULL,
          created_by uuid,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.session_reports (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id uuid NOT NULL UNIQUE,
          student_id uuid NOT NULL,
          teacher_id uuid NOT NULL,
          student_level text NOT NULL,
          session_notes text,
          homework text,
          homework_sent boolean DEFAULT false,
          admin_alert boolean DEFAULT false,
          admin_alert_reason text,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.monthly_reports (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id uuid NOT NULL,
          teacher_id uuid NOT NULL,
          report_month date NOT NULL,
          quran_progress text,
          tajweed_level text,
          attendance_rating text,
          behavior_notes text,
          strengths text,
          weaknesses text,
          recommendations text,
          overall_grade text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.approval_requests (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          teacher_id uuid NOT NULL,
          session_id uuid,
          request_type text NOT NULL,
          details jsonb DEFAULT '{}',
          original_data jsonb,
          status text NOT NULL DEFAULT 'pending',
          admin_notes text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.notifications (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          type text NOT NULL,
          title text NOT NULL,
          body text,
          metadata jsonb DEFAULT '{}',
          is_read boolean NOT NULL DEFAULT false,
          group_id uuid DEFAULT gen_random_uuid(),
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.trial_bookings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name text NOT NULL,
          phone text NOT NULL,
          email text,
          course_interest text,
          preferred_date date,
          preferred_time text,
          timezone text,
          message text,
          status text NOT NULL DEFAULT 'new',
          is_read boolean NOT NULL DEFAULT false,
          admin_notes text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.subscription_requests (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name text NOT NULL,
          phone text NOT NULL,
          email text,
          plan_name text NOT NULL,
          plan_price text,
          sessions_per_week text,
          message text,
          status text NOT NULL DEFAULT 'new',
          is_read boolean NOT NULL DEFAULT false,
          admin_notes text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.teacher_documents (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          teacher_id uuid NOT NULL,
          document_type text NOT NULL,
          file_name text NOT NULL,
          file_url text NOT NULL,
          description text,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.regulations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          section_title text NOT NULL,
          section_title_en text DEFAULT '',
          items jsonb NOT NULL DEFAULT '[]',
          items_en jsonb DEFAULT '[]',
          section_order integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.academy_settings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          key text NOT NULL UNIQUE,
          value text,
          updated_by uuid,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `;
      await conn.queryObject(tableSQL);
      logs.push("✅ All 17 tables created/verified");

      // ======= STEP 3: Functions =======
      const functionsSQL = `
        CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
        RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
          SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
        $$;

        CREATE OR REPLACE FUNCTION public.update_updated_at()
        RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
        BEGIN
          INSERT INTO public.profiles (user_id, full_name)
          VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'));
          RETURN NEW;
        END; $$;

        CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(_user_id uuid)
        RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
        DECLARE _group_ids uuid[];
        BEGIN
          SELECT ARRAY_AGG(DISTINCT group_id) INTO _group_ids FROM public.notifications WHERE user_id = _user_id AND is_read = false AND group_id IS NOT NULL;
          IF _group_ids IS NOT NULL AND array_length(_group_ids, 1) > 0 THEN
            UPDATE public.notifications SET is_read = true WHERE group_id = ANY(_group_ids);
          END IF;
          UPDATE public.notifications SET is_read = true WHERE user_id = _user_id AND is_read = false;
        END; $$;

        CREATE OR REPLACE FUNCTION public.mark_notification_group_read(_notification_id uuid)
        RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
        DECLARE _group_id uuid;
        BEGIN
          SELECT group_id INTO _group_id FROM public.notifications WHERE id = _notification_id;
          IF _group_id IS NOT NULL THEN
            UPDATE public.notifications SET is_read = true WHERE group_id = _group_id;
          ELSE
            UPDATE public.notifications SET is_read = true WHERE id = _notification_id;
          END IF;
        END; $$;

        CREATE OR REPLACE FUNCTION public.handle_session_status_change()
        RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
        BEGIN
          IF (OLD.status = 'absent_student' AND NEW.status = 'postponed') OR (OLD.status = 'postponed' AND NEW.status = 'absent_student') THEN
            RAISE EXCEPTION 'لا يمكن تأجيل حصة مسجلة غياب أو تسجيل غياب لحصة مؤجلة';
          END IF;
          IF NEW.status = 'absent_student' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
            NEW.waiting_minutes := 15; NEW.teacher_paid := true;
          END IF;
          IF NEW.status = 'postponed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
            NEW.teacher_paid := false;
          END IF;
          IF NEW.status = 'completed' AND OLD.status = 'postponed' THEN
            NEW.teacher_paid := true;
          END IF;
          RETURN NEW;
        END; $$;

        CREATE OR REPLACE FUNCTION public.validate_trial_booking_insert()
        RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
        BEGIN NEW.is_read := false; NEW.admin_notes := NULL; NEW.status := 'new'; RETURN NEW; END; $$;

        CREATE OR REPLACE FUNCTION public.validate_subscription_request_insert()
        RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
        BEGIN NEW.is_read := false; NEW.admin_notes := NULL; NEW.status := 'new'; RETURN NEW; END; $$;
      `;
      await conn.queryObject(functionsSQL);
      logs.push("✅ All 8 functions created/updated");

      // ======= STEP 4: Triggers (drop+create) =======
      const tables_with_updated_at = [
        "profiles","teachers","students","sessions","invoices","expenses",
        "monthly_reports","approval_requests","trial_bookings","subscription_requests","regulations","academy_settings"
      ];
      for (const t of tables_with_updated_at) {
        await conn.queryObject(`DROP TRIGGER IF EXISTS update_${t}_updated_at ON public.${t};`);
        await conn.queryObject(`CREATE TRIGGER update_${t}_updated_at BEFORE UPDATE ON public.${t} FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();`);
      }
      await conn.queryObject(`DROP TRIGGER IF EXISTS on_session_status_change ON public.sessions;`);
      await conn.queryObject(`CREATE TRIGGER on_session_status_change BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.handle_session_status_change();`);
      await conn.queryObject(`DROP TRIGGER IF EXISTS validate_trial_booking ON public.trial_bookings;`);
      await conn.queryObject(`CREATE TRIGGER validate_trial_booking BEFORE INSERT ON public.trial_bookings FOR EACH ROW EXECUTE FUNCTION public.validate_trial_booking_insert();`);
      await conn.queryObject(`DROP TRIGGER IF EXISTS validate_subscription_request ON public.subscription_requests;`);
      await conn.queryObject(`CREATE TRIGGER validate_subscription_request BEFORE INSERT ON public.subscription_requests FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_request_insert();`);
      // handle_new_user trigger on auth.users
      try {
        await conn.queryObject(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`);
        await conn.queryObject(`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`);
        logs.push("✅ Auth trigger created");
      } catch (e) { logs.push("⚠️ Auth trigger skipped (may need manual setup)"); }
      logs.push("✅ All triggers created");

      // ======= STEP 5: Enable RLS =======
      const allTables = [
        "profiles","user_roles","teachers","students","sessions","invoices","invoice_students",
        "expenses","session_reports","monthly_reports","approval_requests","notifications",
        "trial_bookings","subscription_requests","teacher_documents","regulations","academy_settings"
      ];
      for (const t of allTables) {
        await conn.queryObject(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
      }
      logs.push("✅ RLS enabled on all tables");

      // ======= STEP 6: RLS Policies (drop+create) =======
      const policies: Array<{table: string, name: string, cmd: string, roles: string, using?: string, check?: string}> = [
        // profiles
        {table:"profiles",name:"Admin full access profiles",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"profiles",name:"Manager read profiles",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"profiles",name:"Users can read own profile",cmd:"SELECT",roles:"authenticated",using:"(user_id = auth.uid())"},
        {table:"profiles",name:"Users can update own profile",cmd:"UPDATE",roles:"authenticated",using:"(user_id = auth.uid())"},
        // user_roles
        {table:"user_roles",name:"Admins can manage roles",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"user_roles",name:"Users can read own role",cmd:"SELECT",roles:"authenticated",using:"(user_id = auth.uid())"},
        // teachers
        {table:"teachers",name:"Admin full access teachers",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"teachers",name:"Manager read teachers",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"teachers",name:"Manager update teachers",cmd:"UPDATE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"teachers",name:"Teacher can read own basic info",cmd:"SELECT",roles:"authenticated",using:"(user_id = auth.uid())"},
        {table:"teachers",name:"Teacher can update own profile",cmd:"UPDATE",roles:"public",using:"(user_id = auth.uid())",check:"(user_id = auth.uid())"},
        // students
        {table:"students",name:"Admin full access students",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"students",name:"Manager read students",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"students",name:"Manager write students",cmd:"INSERT",roles:"public",check:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"students",name:"Manager update students",cmd:"UPDATE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"students",name:"Manager delete students",cmd:"DELETE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        // sessions
        {table:"sessions",name:"Admin full access sessions",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"sessions",name:"Manager read sessions",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"sessions",name:"Manager write sessions",cmd:"INSERT",roles:"public",check:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"sessions",name:"Manager update sessions",cmd:"UPDATE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"sessions",name:"Teacher can view own sessions",cmd:"SELECT",roles:"authenticated",using:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        {table:"sessions",name:"Teacher can update own session status",cmd:"UPDATE",roles:"authenticated",using:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))",check:"((teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())) AND (status = ANY (ARRAY['confirmed','completed','absent_student','postponed'])))"},
        // invoices
        {table:"invoices",name:"Admin full access invoices",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"invoices",name:"Manager read invoices",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"invoices",name:"Manager write invoices",cmd:"INSERT",roles:"public",check:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"invoices",name:"Manager update invoices",cmd:"UPDATE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        // invoice_students
        {table:"invoice_students",name:"Admin full access invoice_students",cmd:"ALL",roles:"public",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"invoice_students",name:"Manager read invoice_students",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"invoice_students",name:"Manager write invoice_students",cmd:"INSERT",roles:"public",check:"has_role(auth.uid(),'manager'::app_role)"},
        // expenses
        {table:"expenses",name:"Admin full access expenses",cmd:"ALL",roles:"public",using:"has_role(auth.uid(),'admin'::app_role)"},
        // session_reports
        {table:"session_reports",name:"Admin full access session_reports",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"session_reports",name:"Manager read session_reports",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"session_reports",name:"Manager create session_reports",cmd:"INSERT",roles:"authenticated",check:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"session_reports",name:"Manager update session_reports",cmd:"UPDATE",roles:"authenticated",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"session_reports",name:"Teacher can create own reports",cmd:"INSERT",roles:"authenticated",check:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        {table:"session_reports",name:"Teacher can view own reports",cmd:"SELECT",roles:"authenticated",using:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        // monthly_reports
        {table:"monthly_reports",name:"Admin full access monthly_reports",cmd:"ALL",roles:"public",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"monthly_reports",name:"Manager read monthly_reports",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"monthly_reports",name:"Manager create monthly_reports",cmd:"INSERT",roles:"authenticated",check:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"monthly_reports",name:"Manager update monthly_reports",cmd:"UPDATE",roles:"authenticated",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"monthly_reports",name:"Teacher can view own reports",cmd:"SELECT",roles:"public",using:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        {table:"monthly_reports",name:"Teacher can create own reports",cmd:"INSERT",roles:"public",check:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        {table:"monthly_reports",name:"Teacher can update own reports",cmd:"UPDATE",roles:"public",using:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        // approval_requests
        {table:"approval_requests",name:"Admin full access approval_requests",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"approval_requests",name:"Manager read approval_requests",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"approval_requests",name:"Manager update approval_requests",cmd:"UPDATE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"approval_requests",name:"Teacher can create approval requests",cmd:"INSERT",roles:"authenticated",check:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        {table:"approval_requests",name:"Teacher can view own requests",cmd:"SELECT",roles:"authenticated",using:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        // notifications
        {table:"notifications",name:"Admin full access notifications",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"notifications",name:"Admin manager insert notifications",cmd:"INSERT",roles:"authenticated",check:"(has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))"},
        {table:"notifications",name:"Users can read own notifications",cmd:"SELECT",roles:"authenticated",using:"(user_id = auth.uid())"},
        {table:"notifications",name:"Users can update own notifications",cmd:"UPDATE",roles:"authenticated",using:"(user_id = auth.uid())"},
        // trial_bookings
        {table:"trial_bookings",name:"Admin full access trial_bookings",cmd:"ALL",roles:"public",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"trial_bookings",name:"Anyone can insert trial_bookings",cmd:"INSERT",roles:"public",check:"true"},
        {table:"trial_bookings",name:"Manager read trial_bookings",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"trial_bookings",name:"Manager update trial_bookings",cmd:"UPDATE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"trial_bookings",name:"Manager delete trial_bookings",cmd:"DELETE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        // subscription_requests
        {table:"subscription_requests",name:"Admin full access subscription_requests",cmd:"ALL",roles:"public",using:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"subscription_requests",name:"Anyone can insert subscription_requests",cmd:"INSERT",roles:"public",check:"true"},
        {table:"subscription_requests",name:"Manager read subscription_requests",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"subscription_requests",name:"Manager update subscription_requests",cmd:"UPDATE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"subscription_requests",name:"Manager delete subscription_requests",cmd:"DELETE",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        // teacher_documents
        {table:"teacher_documents",name:"Admin full access teacher_documents",cmd:"ALL",roles:"public",using:"has_role(auth.uid(),'admin'::app_role)",check:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"teacher_documents",name:"Manager read teacher_documents",cmd:"SELECT",roles:"public",using:"has_role(auth.uid(),'manager'::app_role)"},
        {table:"teacher_documents",name:"Teacher manage own documents",cmd:"ALL",roles:"public",using:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))",check:"(teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))"},
        // regulations
        {table:"regulations",name:"Admin full access regulations",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)",check:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"regulations",name:"All authenticated can read regulations",cmd:"SELECT",roles:"authenticated",using:"true"},
        // academy_settings
        {table:"academy_settings",name:"Admin full access academy_settings",cmd:"ALL",roles:"authenticated",using:"has_role(auth.uid(),'admin'::app_role)",check:"has_role(auth.uid(),'admin'::app_role)"},
        {table:"academy_settings",name:"Manager read academy_settings",cmd:"SELECT",roles:"authenticated",using:"has_role(auth.uid(),'manager'::app_role)"},
      ];

      for (const p of policies) {
        await conn.queryObject(`DROP POLICY IF EXISTS "${p.name}" ON public.${p.table};`);
        let sql = `CREATE POLICY "${p.name}" ON public.${p.table} FOR ${p.cmd} TO ${p.roles}`;
        if (p.using) sql += ` USING (${p.using})`;
        if (p.check) sql += ` WITH CHECK (${p.check})`;
        sql += ";";
        await conn.queryObject(sql);
      }
      logs.push(`✅ ${policies.length} RLS policies created`);

      // ======= STEP 7: Views =======
      await conn.queryObject(`
        CREATE OR REPLACE VIEW public.teachers_self_view AS
        SELECT id, user_id, hourly_rate, qualification, age, is_active, zoom_link, created_at
        FROM public.teachers WHERE user_id = auth.uid();
      `);
      await conn.queryObject(`
        CREATE OR REPLACE VIEW public.teachers_manager_view AS
        SELECT id, user_id, qualification, age, subjects, is_active, students_count, rating,
               zoom_link, bio, show_on_website, website_visible_fields, gender,
               profile_completed, ijazat, academic_degree, rate_currency, created_at, updated_at
        FROM public.teachers;
      `);
      logs.push("✅ Views created");

      // ======= STEP 8: Sync data =======
      if (mode === "schema_and_data" || mode === "data_only") {
        const dataTables = [
          "regulations", "academy_settings", "students", "sessions",
          "invoices", "invoice_students", "expenses", "session_reports",
          "monthly_reports", "approval_requests", "notifications",
          "trial_bookings", "subscription_requests", "teacher_documents"
        ];

        // Read from source (current Lovable Cloud DB via Supabase client)
        for (const tableName of dataTables) {
          const { data, error } = await adminClient.from(tableName).select("*");
          if (error || !data || data.length === 0) {
            logs.push(`ℹ️ ${tableName}: ${error ? error.message : 'no data'}`);
            continue;
          }

          // Upsert each row
          let synced = 0;
          for (const row of data) {
            const cols = Object.keys(row);
            const vals = cols.map((_, i) => `$${i + 1}`);
            const updates = cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`);
            const sql = `INSERT INTO public.${tableName} (${cols.map(c => `"${c}"`).join(",")}) VALUES (${vals.join(",")}) ON CONFLICT (id) DO UPDATE SET ${updates.join(",")}`;
            try {
              await conn.queryObject(sql, Object.values(row));
              synced++;
            } catch (e) {
              errors.push(`${tableName} row: ${e.message}`);
            }
          }
          logs.push(`✅ ${tableName}: ${synced}/${data.length} rows synced`);
        }
      }

      // ======= STEP 9: Storage bucket =======
      try {
        await conn.queryObject(`INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-files','teacher-files',true) ON CONFLICT (id) DO NOTHING;`);
        logs.push("✅ Storage bucket ready");
      } catch (e) { logs.push("⚠️ Storage bucket skipped"); }

    } finally {
      conn.release();
      await pool.end();
    }

    return new Response(JSON.stringify({ 
      success: true, 
      logs, 
      errors: errors.length > 0 ? errors : undefined 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});