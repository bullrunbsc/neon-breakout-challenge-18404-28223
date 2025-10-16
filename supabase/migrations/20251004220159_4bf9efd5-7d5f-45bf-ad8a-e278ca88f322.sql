-- Add winner_rank column to players table
ALTER TABLE public.players 
ADD COLUMN winner_rank INTEGER DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.players.winner_rank IS 'Ranking for winners: 1 = first place, 2 = second place, 3 = third place, NULL = not a winner';