-- Drop the view since we'll use column-level privileges instead
DROP VIEW IF EXISTS public.player_rounds;

-- Keep the admin-only SELECT policy
-- (already exists from previous migration)

-- Grant SELECT on specific safe columns to authenticated and anon roles
-- This allows non-admins to read rounds data except the correct_code column
REVOKE ALL ON public.rounds FROM authenticated, anon;
GRANT SELECT (id, game_id, round_number, question, starts_at, ends_at, created_at) 
  ON public.rounds TO authenticated, anon;

-- Create a permissive SELECT policy for non-admins on safe columns only
DROP POLICY IF EXISTS "Only admins can view rounds table directly" ON public.rounds;

CREATE POLICY "Admins can view all round data"
ON public.rounds
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Players can view round questions without answers"
ON public.rounds
FOR SELECT
TO authenticated, anon
USING (true);