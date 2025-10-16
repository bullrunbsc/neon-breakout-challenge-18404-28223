-- Allow players to view their own answers
CREATE POLICY "Players can view their own answers"
ON public.answers
FOR SELECT
USING (player_id IN (
  SELECT id FROM public.players WHERE wallet_address = auth.uid()::text
));