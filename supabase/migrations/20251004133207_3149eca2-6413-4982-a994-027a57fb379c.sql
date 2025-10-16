-- Add policies to allow admin operations on games
CREATE POLICY "Anyone can create games"
  ON public.games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update games"
  ON public.games FOR UPDATE
  USING (true);

-- Add policies for rounds (admin creates rounds)
CREATE POLICY "Anyone can create rounds"
  ON public.rounds FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update rounds"
  ON public.rounds FOR UPDATE
  USING (true);

-- Add policy to update players (for elimination status)
CREATE POLICY "Anyone can update players"
  ON public.players FOR UPDATE
  USING (true);