-- Add group_id to notifications for shared read status
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS group_id uuid DEFAULT gen_random_uuid();

-- Add dot_color to profiles for admin/manager identity
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dot_color text DEFAULT NULL;

-- Create a function to mark all notifications in the same group as read (security definer)
CREATE OR REPLACE FUNCTION public.mark_notification_group_read(_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _group_id uuid;
BEGIN
  -- Get the group_id from the notification
  SELECT group_id INTO _group_id FROM public.notifications WHERE id = _notification_id;
  
  IF _group_id IS NOT NULL THEN
    UPDATE public.notifications SET is_read = true WHERE group_id = _group_id;
  ELSE
    UPDATE public.notifications SET is_read = true WHERE id = _notification_id;
  END IF;
END;
$$;

-- Function to mark all notifications in multiple groups as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _group_ids uuid[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT group_id) INTO _group_ids 
  FROM public.notifications 
  WHERE user_id = _user_id AND is_read = false AND group_id IS NOT NULL;
  
  IF _group_ids IS NOT NULL AND array_length(_group_ids, 1) > 0 THEN
    UPDATE public.notifications SET is_read = true WHERE group_id = ANY(_group_ids);
  END IF;
  
  -- Also mark any without group_id
  UPDATE public.notifications SET is_read = true WHERE user_id = _user_id AND is_read = false;
END;
$$;