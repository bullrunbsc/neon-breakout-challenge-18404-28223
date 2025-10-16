-- Create a secure function to validate answers
-- This runs on the server and never exposes the correct answer to clients
CREATE OR REPLACE FUNCTION public.validate_answer(
  p_round_id UUID,
  p_player_id UUID,
  p_submitted_code TEXT
)
RETURNS TABLE (
  is_correct BOOLEAN,
  already_submitted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_code TEXT;
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
  
  -- Get the correct code for this round
  SELECT correct_code INTO v_correct_code
  FROM rounds
  WHERE id = p_round_id;
  
  -- Compare submitted code with correct code (case-insensitive)
  RETURN QUERY SELECT 
    LOWER(TRIM(p_submitted_code)) = LOWER(TRIM(v_correct_code)),
    false;
END;
$$;