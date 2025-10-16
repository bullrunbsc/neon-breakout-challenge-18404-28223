-- Drop the view first
DROP VIEW IF EXISTS rounds_safe CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.admin_create_round(uuid, integer, text, text, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.admin_get_round(uuid, integer);
DROP FUNCTION IF EXISTS public.get_round_safe(uuid, integer);
DROP FUNCTION IF EXISTS public.get_current_round_safe(uuid);
DROP FUNCTION IF EXISTS public.validate_answer(uuid, uuid, text);

-- Update rounds table to use door mechanics instead of questions
ALTER TABLE public.rounds DROP COLUMN IF EXISTS question;
ALTER TABLE public.rounds DROP COLUMN IF EXISTS correct_code;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS correct_door integer NOT NULL DEFAULT 1 CHECK (correct_door >= 1 AND correct_door <= 3);

-- Update answers table to use door selection instead of code submission
ALTER TABLE public.answers DROP COLUMN IF EXISTS submitted_code;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS selected_door integer NOT NULL DEFAULT 1 CHECK (selected_door >= 1 AND selected_door <= 3);

-- Recreate the rounds_safe view without question field
CREATE VIEW rounds_safe AS
SELECT 
  id,
  game_id,
  round_number,
  starts_at,
  ends_at,
  created_at
FROM public.rounds;

-- Create the validate_answer function to work with doors
CREATE FUNCTION public.validate_answer(p_round_id uuid, p_player_id uuid, p_selected_door integer)
RETURNS TABLE(is_correct boolean, already_submitted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_correct_door INTEGER;
  v_existing_answer UUID;
BEGIN
  -- Check if player already submitted an answer for this round
  SELECT id INTO v_existing_answer
  FROM answers
  WHERE round_id = p_round_id AND player_id = p_player_id
  LIMIT 1;
  
  IF v_existing_answer IS NOT NULL THEN
    RETURN QUERY SELECT false, true;
    RETURN;
  END IF;
  
  -- Get the correct door for this round
  SELECT correct_door INTO v_correct_door
  FROM rounds
  WHERE id = p_round_id;
  
  -- Compare selected door with correct door
  RETURN QUERY SELECT 
    p_selected_door = v_correct_door,
    false;
END;
$$;

-- Create admin_create_round function to use doors
CREATE FUNCTION public.admin_create_round(
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

  -- Insert and return the new round
  RETURN QUERY
  INSERT INTO public.rounds (game_id, round_number, correct_door, starts_at, ends_at)
  VALUES (p_game_id, p_round_number, p_correct_door, p_starts_at, p_ends_at)
  RETURNING rounds.id, rounds.game_id, rounds.round_number, rounds.correct_door, rounds.starts_at, rounds.ends_at, rounds.created_at;
END;
$$;

-- Create admin_get_round function to use doors
CREATE FUNCTION public.admin_get_round(p_game_id uuid, p_round_number integer)
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can query rounds directly';
  END IF;

  -- Return the round data
  RETURN QUERY
  SELECT 
    rounds.id, 
    rounds.game_id, 
    rounds.round_number, 
    rounds.correct_door, 
    rounds.starts_at, 
    rounds.ends_at, 
    rounds.created_at
  FROM public.rounds
  WHERE rounds.game_id = p_game_id 
    AND rounds.round_number = p_round_number
  LIMIT 1;
END;
$$;

-- Create get_round_safe function without question field
CREATE FUNCTION public.get_round_safe(p_game_id uuid, p_round_number integer)
RETURNS TABLE(
  id uuid, 
  game_id uuid, 
  round_number integer, 
  starts_at timestamp with time zone, 
  ends_at timestamp with time zone, 
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id,
    game_id,
    round_number,
    starts_at,
    ends_at,
    created_at
  FROM public.rounds
  WHERE game_id = p_game_id 
    AND round_number = p_round_number
  LIMIT 1;
$$;

-- Create get_current_round_safe function without question field
CREATE FUNCTION public.get_current_round_safe(p_game_id uuid)
RETURNS TABLE(
  id uuid, 
  game_id uuid, 
  round_number integer, 
  starts_at timestamp with time zone, 
  ends_at timestamp with time zone, 
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id,
    game_id,
    round_number,
    starts_at,
    ends_at,
    created_at
  FROM public.rounds
  WHERE game_id = p_game_id
  ORDER BY round_number DESC
  LIMIT 1;
$$;