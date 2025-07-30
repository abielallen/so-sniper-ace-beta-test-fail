-- Phase 1: Critical Database Security Fixes

-- 1. Add comprehensive RLS policies for "Solflare Wallet Keys" table
CREATE POLICY "Users can view their own wallet keys" 
ON public."Solflare Wallet Keys" 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can insert their own wallet keys" 
ON public."Solflare Wallet Keys" 
FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own wallet keys" 
ON public."Solflare Wallet Keys" 
FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Users can delete their own wallet keys" 
ON public."Solflare Wallet Keys" 
FOR DELETE 
USING (id = auth.uid());

-- Enable RLS on the table if not already enabled
ALTER TABLE public."Solflare Wallet Keys" ENABLE ROW LEVEL SECURITY;

-- 2. Fix database function security - update search_path for existing function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 3. Add missing UPDATE and DELETE policies for withdrawals table
CREATE POLICY "Users can update their own withdrawals" 
ON public.withdrawals 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own withdrawals" 
ON public.withdrawals 
FOR DELETE 
USING (user_id = auth.uid());

-- 4. Add missing UPDATE and DELETE policies for wallet_payouts table  
CREATE POLICY "Users can update their own payouts" 
ON public.wallet_payouts 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own payouts" 
ON public.wallet_payouts 
FOR DELETE 
USING (user_id = auth.uid());

-- 5. Add missing DELETE policy for balances table
CREATE POLICY "Users can delete their own balance" 
ON public.balances 
FOR DELETE 
USING (user_id = auth.uid());