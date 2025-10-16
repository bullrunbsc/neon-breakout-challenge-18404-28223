-- Fix ambiguous column reference in admin_create_round
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
DECLARE
  v_round_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create rounds';
  END IF;

  -- Insert or update the round (upsert to handle duplicates)
  INSERT INTO public.rounds (game_id, round_number, correct_door, starts_at, ends_at)
  VALUES (p_game_id, p_round_number, p_correct_door, p_starts_at, p_ends_at)
  ON CONFLICT (game_id, round_number) 
  DO UPDATE SET 
    correct_door = EXCLUDED.correct_door,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    created_at = now()
  RETURNING id INTO v_round_id;
  
  -- Return the round data
  RETURN QUERY
  SELECT 
    r.id, 
    r.game_id, 
    r.round_number, 
    r.correct_door, 
    r.starts_at, 
    r.ends_at, 
    r.created_at
  FROM public.rounds r
  WHERE r.id = v_round_id;
END;
$$;