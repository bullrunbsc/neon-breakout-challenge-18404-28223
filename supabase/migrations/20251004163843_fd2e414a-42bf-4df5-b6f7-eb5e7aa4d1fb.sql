-- Allow INSERT to admin_users only when table is empty (first admin setup)
CREATE POLICY "Allow first admin creation"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT COUNT(*) FROM public.admin_users) = 0
);