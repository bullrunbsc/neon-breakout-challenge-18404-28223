-- Create admin function to create a new round
CREATE OR REPLACE FUNCTION public.admin_create_round(
  p_game_id uuid,
  p_round_number integer,
  p_question text,
  p_correct_code text,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone
)
RETURNS TABLE (
  id uuid,
  game_id uuid,
  round_number integer,
  question text,
  correct_code text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create rounds';
  END IF;

  -- Insert and return the new round
  RETURN QUERY
  INSERT INTO public.rounds (game_id, round_number, question, correct_code, starts_at, ends_at)
  VALUES (p_game_id, p_round_number, p_question, p_correct_code, p_starts_at, p_ends_at)
  RETURNING rounds.id, rounds.game_id, rounds.round_number, rounds.question, rounds.correct_code, rounds.starts_at, rounds.ends_at, rounds.created_at;
END;
$$;

-- Create admin function to check if a round exists
CREATE OR REPLACE FUNCTION public.admin_get_round(
  p_game_id uuid,
  p_round_number integer
)
RETURNS TABLE (
  id uuid,
  game_id uuid,
  round_number integer,
  question text,
  correct_code text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can query rounds directly';
  END IF;

  -- Return the round data
  RETURN QUERY
  SELECT rounds.id, rounds.game_id, rounds.round_number, rounds.question, rounds.correct_code, rounds.starts_at, rounds.ends_at, rounds.created_at
  FROM public.rounds
  WHERE rounds.game_id = p_game_id 
    AND rounds.round_number = p_round_number
  LIMIT 1;
END;
$$;