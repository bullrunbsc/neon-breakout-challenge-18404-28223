-- Add indexes for frequently queried columns to improve performance with many players

-- Index for games table queries
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON public.games(created_at DESC);

-- Index for players table queries
CREATE INDEX IF NOT EXISTS idx_players_game_id ON public.players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_status ON public.players(status);
CREATE INDEX IF NOT EXISTS idx_players_game_status ON public.players(game_id, status);
CREATE INDEX IF NOT EXISTS idx_players_wallet ON public.players(wallet_address);

-- Index for rounds table queries
CREATE INDEX IF NOT EXISTS idx_rounds_game_id ON public.rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_rounds_game_round ON public.rounds(game_id, round_number);

-- Index for answers table queries
CREATE INDEX IF NOT EXISTS idx_answers_round_id ON public.answers(round_id);
CREATE INDEX IF NOT EXISTS idx_answers_player_id ON public.answers(player_id);
CREATE INDEX IF NOT EXISTS idx_answers_round_player ON public.answers(round_id, player_id);