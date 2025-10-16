-- Insert admin user for dr.razvi01@gmail.com
-- This will work after the user signs up with this email
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id for the email if it exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'dr.razvi01@gmail.com';
  
  -- If user exists, add them to admin_users
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.admin_users (user_id)
    VALUES (v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;