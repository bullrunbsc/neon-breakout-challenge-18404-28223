-- Create admin_users table to track authorized administrators
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin_users table
CREATE POLICY "Only admins can view admin_users"
ON public.admin_users
FOR SELECT
USING (user_id = auth.uid());

-- Create security definer function to check admin status
-- This prevents RLS recursion issues and provides server-side role checking
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = check_user_id
  )
$$;

-- ============================================
-- FIX GAMES TABLE RLS POLICIES
-- ============================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;

-- Create secure admin-only policies
CREATE POLICY "Only admins can create games"
ON public.games
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update games"
ON public.games
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Keep public read access for players
-- (already exists: "Anyone can view games")

-- ============================================
-- FIX ROUNDS TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can create rounds" ON public.rounds;
DROP POLICY IF EXISTS "Anyone can update rounds" ON public.rounds;

CREATE POLICY "Only admins can create rounds"
ON public.rounds
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update rounds"
ON public.rounds
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Keep public read access for players
-- (already exists: "Players can view round questions only")

-- ============================================
-- FIX PLAYERS TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can update players" ON public.players;

CREATE POLICY "Only admins can update players"
ON public.players
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Keep public join access
-- (already exists: "Anyone can join as player")

-- ============================================
-- FIX ANSWERS TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view answers" ON public.answers;

-- Only admins can view answers (protects player privacy and strategy)
CREATE POLICY "Only admins can view answers"
ON public.answers
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Keep player submit access
-- (already exists: "Players can submit answers")