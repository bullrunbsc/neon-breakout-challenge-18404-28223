-- Fix security definer views by setting security_invoker to true
-- This ensures views use the querying user's permissions, not the creator's

-- Drop and recreate rounds_safe view with security_invoker
DROP VIEW IF EXISTS public.rounds_safe;
CREATE VIEW public.rounds_safe 
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

-- Drop and recreate players_public view with security_invoker
DROP VIEW IF EXISTS public.players_public;
CREATE VIEW public.players_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  game_id,
  status,
  joined_at,
  eliminated_at
FROM public.players;

-- Re-grant public access to the secure views
GRANT SELECT ON public.rounds_safe TO authenticated, anon;
GRANT SELECT ON public.players_public TO authenticated, anon;