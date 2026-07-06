
-- PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  action text NOT NULL CHECK (action IN ('view','create','edit','delete','approve')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module, action)
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_read_all_auth" ON public.permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_admin_write" ON public.permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.permissions p ON p.role = ur.role
    WHERE ur.user_id = _user_id AND p.module = _module AND p.action = _action
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated, service_role;

INSERT INTO public.permissions (role, module, action) VALUES
  ('admin','students','view'),('admin','students','create'),('admin','students','edit'),('admin','students','delete'),
  ('admin','teachers','view'),('admin','teachers','create'),('admin','teachers','edit'),('admin','teachers','delete'),
  ('admin','sessions','view'),('admin','sessions','create'),('admin','sessions','edit'),('admin','sessions','delete'),('admin','sessions','approve'),
  ('admin','invoices','view'),('admin','invoices','create'),('admin','invoices','edit'),('admin','invoices','delete'),('admin','invoices','approve'),
  ('admin','expenses','view'),('admin','expenses','create'),('admin','expenses','edit'),('admin','expenses','delete'),
  ('admin','reports','view'),
  ('admin','settings','view'),('admin','settings','edit'),
  ('admin','audit_log','view'),
  ('admin','parents','view'),('admin','parents','create'),('admin','parents','edit'),('admin','parents','delete'),
  ('admin','permissions','view'),('admin','permissions','edit'),
  ('manager','students','view'),('manager','students','create'),('manager','students','edit'),
  ('manager','teachers','view'),('manager','teachers','edit'),
  ('manager','sessions','view'),('manager','sessions','create'),('manager','sessions','edit'),('manager','sessions','approve'),
  ('manager','reports','view'),
  ('manager','parents','view'),('manager','parents','create'),('manager','parents','edit'),
  ('teacher','sessions','view'),('teacher','sessions','create'),('teacher','sessions','edit'),
  ('teacher','students','view'),
  ('student','sessions','view'),
  ('parent','sessions','view'),('parent','students','view'),('parent','invoices','view')
ON CONFLICT (role, module, action) DO NOTHING;

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log (entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_audit(
  _action text, _entity_table text, _entity_id uuid,
  _before jsonb DEFAULT NULL, _after jsonb DEFAULT NULL, _reason text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := auth.uid(); _role text; _id uuid;
BEGIN
  SELECT role::text INTO _role FROM public.user_roles WHERE user_id = _actor LIMIT 1;
  INSERT INTO public.audit_log (actor_id, actor_role, action, entity_table, entity_id, before, after, reason)
  VALUES (_actor, _role, _action, _entity_table, _entity_id, _before, _after, _reason)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb, jsonb, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _entity_id uuid; _before jsonb; _after jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _entity_id := OLD.id; _before := to_jsonb(OLD); _after := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    _entity_id := NEW.id; _before := to_jsonb(OLD); _after := to_jsonb(NEW);
    IF _before = _after THEN RETURN NEW; END IF;
  ELSE
    _entity_id := NEW.id; _before := NULL; _after := to_jsonb(NEW);
  END IF;
  PERFORM public.log_audit(lower(TG_OP), TG_TABLE_NAME, _entity_id, _before, _after, NULL);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_students ON public.students;
CREATE TRIGGER audit_students AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row_change();
DROP TRIGGER IF EXISTS audit_sessions ON public.sessions;
CREATE TRIGGER audit_sessions AFTER INSERT OR UPDATE OR DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row_change();
DROP TRIGGER IF EXISTS audit_session_reports ON public.session_reports;
CREATE TRIGGER audit_session_reports AFTER INSERT OR UPDATE OR DELETE ON public.session_reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row_change();
DROP TRIGGER IF EXISTS audit_invoices ON public.invoices;
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row_change();
DROP TRIGGER IF EXISTS audit_teachers ON public.teachers;
CREATE TRIGGER audit_teachers AFTER INSERT OR UPDATE OR DELETE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row_change();
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row_change();

-- PARENTS
CREATE TABLE IF NOT EXISTS public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text, whatsapp text, email text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT ALL ON public.parents TO service_role;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_self_read" ON public.parents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "parents_self_update" ON public.parents FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "parents_staff_insert" ON public.parents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "parents_admin_delete" ON public.parents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER parents_touch_updated BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- STUDENT_PARENTS
CREATE TABLE IF NOT EXISTS public.student_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, parent_id)
);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON public.student_parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_student ON public.student_parents(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_parents TO authenticated;
GRANT ALL ON public.student_parents TO service_role;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_parent_of(_parent_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON p.id = sp.parent_id
    WHERE p.user_id = _parent_user_id AND sp.student_id = _student_id
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "student_parents_read" ON public.student_parents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
      OR EXISTS (SELECT 1 FROM public.parents p WHERE p.id = student_parents.parent_id AND p.user_id = auth.uid()));
CREATE POLICY "student_parents_staff_write" ON public.student_parents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
