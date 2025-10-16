-- Create payouts table for leaderboard
CREATE TABLE public.payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winner_wallet TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  amount TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing payouts
CREATE POLICY "Anyone can view payouts" 
ON public.payouts 
FOR SELECT 
USING (true);

-- Create policy for admins to insert payouts
CREATE POLICY "Only admins can create payouts" 
ON public.payouts 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_payouts_created_at ON public.payouts(created_at DESC);