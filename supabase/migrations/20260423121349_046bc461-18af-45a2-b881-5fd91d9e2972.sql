-- 0) Delete test invoices first (with their items)
DELETE FROM public.invoice_students 
WHERE invoice_id IN (
  SELECT id FROM public.invoices 
  WHERE student_id IN (SELECT id FROM public.students WHERE name LIKE '%تجريبي%' OR name LIKE '%الفحص%')
);
DELETE FROM public.invoices 
WHERE student_id IN (SELECT id FROM public.students WHERE name LIKE '%تجريبي%' OR name LIKE '%الفحص%');

-- 1) Purge stuck failed sync events
DELETE FROM public.external_sync_events
WHERE status = 'failed' AND attempts >= 20;

DELETE FROM public.external_sync_events
WHERE status = 'failed'
  AND table_name = 'teachers'
  AND record_id NOT IN (SELECT id FROM public.teachers);

DELETE FROM public.external_sync_events
WHERE status = 'failed'
  AND table_name = 'sessions'
  AND record_id NOT IN (SELECT id FROM public.sessions);

DELETE FROM public.external_sync_events
WHERE status = 'failed'
  AND table_name = 'students'
  AND record_id NOT IN (SELECT id FROM public.students);

-- 2) Cleanup test data
DELETE FROM public.session_reports WHERE student_id IN (SELECT id FROM public.students WHERE name LIKE '%تجريبي%' OR name LIKE '%الفحص%');
DELETE FROM public.sessions WHERE student_id IN (SELECT id FROM public.students WHERE name LIKE '%تجريبي%' OR name LIKE '%الفحص%');
DELETE FROM public.students WHERE name LIKE '%تجريبي%' OR name LIKE '%الفحص%';

DELETE FROM public.subscription_requests WHERE full_name LIKE '%الفحص%' OR full_name LIKE '%تجريبي%' OR full_name = 'أحمد محمد الشريف';
DELETE FROM public.trial_bookings WHERE full_name LIKE '%الفحص%' OR full_name LIKE '%تجريبي%';