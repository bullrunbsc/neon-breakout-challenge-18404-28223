-- Drop and recreate the view with SECURITY INVOKER to prevent privilege escalation
DROP VIEW IF EXISTS public.player_rounds;

CREATE OR REPLACE VIEW public.player_rounds
WITH (security_invoker = true)
AS
SELECT 
  id,
  game_id,
  round_number,
  question,
  starts_at,
  ends_at,
  created_at
FROM public.rounds;

-- Grant access to the view
GRANT SELECT ON public.player_rounds TO authenticated;
GRANT SELECT ON public.player_rounds TO anon;