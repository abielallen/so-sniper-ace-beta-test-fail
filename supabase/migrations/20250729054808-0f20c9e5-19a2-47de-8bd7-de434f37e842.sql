-- Fix RLS policies for balances table
DROP POLICY IF EXISTS "Users can view their own balance" ON public.balances;
DROP POLICY IF EXISTS "Users can insert their own balance" ON public.balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.balances;

-- Create secure RLS policies for balances table
CREATE POLICY "Users can view their own balance" 
ON public.balances 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own balance" 
ON public.balances 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own balance" 
ON public.balances 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Fix RLS policies for withdrawals table
DROP POLICY IF EXISTS "Users can view all withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;

CREATE POLICY "Users can view their own withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own withdrawals" 
ON public.withdrawals 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add RLS policies for wallet_payouts table
ALTER TABLE public.wallet_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts" 
ON public.wallet_payouts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own payouts" 
ON public.wallet_payouts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add user_id column to balances table to properly link to authenticated users
ALTER TABLE public.balances ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to withdrawals table
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to wallet_payouts table
ALTER TABLE public.wallet_payouts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies to use user_id
DROP POLICY IF EXISTS "Users can view their own balance" ON public.balances;
DROP POLICY IF EXISTS "Users can insert their own balance" ON public.balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.balances;

CREATE POLICY "Users can view their own balance" 
ON public.balances 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own balance" 
ON public.balances 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own balance" 
ON public.balances 
FOR UPDATE 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can insert their own withdrawals" ON public.withdrawals;

CREATE POLICY "Users can view their own withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own withdrawals" 
ON public.withdrawals 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own payouts" ON public.wallet_payouts;
DROP POLICY IF EXISTS "Users can insert their own payouts" ON public.wallet_payouts;

CREATE POLICY "Users can view their own payouts" 
ON public.wallet_payouts 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payouts" 
ON public.wallet_payouts 
FOR INSERT 
WITH CHECK (user_id = auth.uid());