
-- Add approval tracking columns to sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN DEFAULT false;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS original_data JSONB;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'none' CHECK (approval_status IN ('none', 'pending', 'approved', 'rejected'));

-- Update approval_requests to support more types and link back to rollback
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_request_type_check;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_request_type_check
  CHECK (request_type IN ('reschedule', 'transfer', 'join_postponed', 'edit_schedule'));

-- Add original_data to approval_requests for rollback
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS original_data JSONB;
