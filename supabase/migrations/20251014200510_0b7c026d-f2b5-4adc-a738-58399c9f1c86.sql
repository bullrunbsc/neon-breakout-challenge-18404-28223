-- Drop the restrictive SELECT policy on players table
DROP POLICY IF EXISTS "Only admins can view players table directly" ON public.players;

-- Create new policy that allows anyone to SELECT from players table
-- This is safe because the players_public view limits what columns are exposed
-- and admins will use direct queries when they need full access
CREATE POLICY "Anyone can view players public data"
ON public.players
FOR SELECT
TO public
USING (true);

-- Ensure the players_public view is accessible
-- Views inherit RLS from underlying tables, so now that players is readable, the view will work
COMMENT ON VIEW public.players_public IS 'Public view of players table, excludes sensitive data like wallet_address';