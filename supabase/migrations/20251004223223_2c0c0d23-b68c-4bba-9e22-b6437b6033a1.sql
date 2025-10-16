-- Create a security definer function to safely fetch round data without correct_code
CREATE OR REPLACE FUNCTION public.get_round_safe(p_game_id uuid, p_round_number integer)
RETURNS TABLE (
  id uuid,
  game_id uuid,
  round_number integer,
  question text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    game_id,
    round_number,
    question,
    starts_at,
    ends_at,
    created_at
  FROM public.rounds
  WHERE game_id = p_game_id 
    AND round_number = p_round_number
  LIMIT 1;
$$;

-- Create function to get current round for a game
CREATE OR REPLACE FUNCTION public.get_current_round_safe(p_game_id uuid)
RETURNS TABLE (
  id uuid,
  game_id uuid,
  round_number integer,
  question text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    game_id,
    round_number,
    question,
    starts_at,
    ends_at,
    created_at
  FROM public.rounds
  WHERE game_id = p_game_id
  ORDER BY round_number DESC
  LIMIT 1;
$$;