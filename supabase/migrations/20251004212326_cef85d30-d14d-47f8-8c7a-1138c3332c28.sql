-- Create safe view for rounds (excludes correct_code)
CREATE OR REPLACE VIEW public.rounds_safe AS
SELECT 
  id,
  game_id,
  round_number,
  question,
  starts_at,
  ends_at,
  created_at
FROM public.rounds;

-- Create safe view for players (excludes wallet_address)
CREATE OR REPLACE VIEW public.players_public AS
SELECT 
  id,
  game_id,
  status,
  joined_at,
  eliminated_at
FROM public.players;

-- Update rounds table RLS: Keep column-level grants for backward compatibility
-- but also add stricter policies
DROP POLICY IF EXISTS "Players can view round questions without answers" ON public.rounds;

CREATE POLICY "Only admins can access rounds table directly"
ON public.rounds
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Update players table RLS: Remove public access, restrict to admins only
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;

CREATE POLICY "Only admins can view players table directly"
ON public.players
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Grant public access to the safe views instead
GRANT SELECT ON public.rounds_safe TO authenticated, anon;
GRANT SELECT ON public.players_public TO authenticated, anon;