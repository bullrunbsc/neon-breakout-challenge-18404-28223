-- Drop the overly permissive SELECT policy on rounds table
DROP POLICY IF EXISTS "Players can view round questions only" ON public.rounds;

-- Create a new SELECT policy that only allows admins to view the rounds table directly
CREATE POLICY "Only admins can view rounds table directly"
ON public.rounds
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Create a secure view for players that excludes the correct_code column
CREATE OR REPLACE VIEW public.player_rounds AS
SELECT 
  id,
  game_id,
  round_number,
  question,
  starts_at,
  ends_at,
  created_at
FROM public.rounds;

-- Grant access to the view for all authenticated users
GRANT SELECT ON public.player_rounds TO authenticated;
GRANT SELECT ON public.player_rounds TO anon;