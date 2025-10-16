-- Fix admin_create_round to handle duplicate rounds using upsert
CREATE OR REPLACE FUNCTION public.admin_create_round(
  p_game_id uuid, 
  p_round_number integer, 
  p_correct_door integer, 
  p_starts_at timestamp with time zone, 
  p_ends_at timestamp with time zone
)
RETURNS TABLE(
  id uuid, 
  game_id uuid, 
  round_number integer, 
  correct_door integer, 
  starts_at timestamp with time zone, 
  ends_at timestamp with time zone, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create rounds';
  END IF;

  -- Insert or update the round (upsert to handle duplicates)
  RETURN QUERY
  INSERT INTO public.rounds (game_id, round_number, correct_door, starts_at, ends_at)
  VALUES (p_game_id, p_round_number, p_correct_door, p_starts_at, p_ends_at)
  ON CONFLICT (game_id, round_number) 
  DO UPDATE SET 
    correct_door = EXCLUDED.correct_door,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    created_at = now()
  RETURNING rounds.id, rounds.game_id, rounds.round_number, rounds.correct_door, rounds.starts_at, rounds.ends_at, rounds.created_at;
END;
$$;