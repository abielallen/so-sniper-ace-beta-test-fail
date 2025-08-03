-- Fix nullable user_id columns for security
-- Make user_id NOT NULL in balances table
ALTER TABLE public.balances 
ALTER COLUMN user_id SET NOT NULL;

-- Make user_id NOT NULL in withdrawals table  
ALTER TABLE public.withdrawals
ALTER COLUMN user_id SET NOT NULL;

-- Make user_id NOT NULL in wallet_payouts table
ALTER TABLE public.wallet_payouts
ALTER COLUMN user_id SET NOT NULL;

-- Add withdrawal limits and rate limiting table
CREATE TABLE public.withdrawal_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  daily_limit NUMERIC NOT NULL DEFAULT 10000,
  hourly_limit NUMERIC NOT NULL DEFAULT 3000,
  last_withdrawal_at TIMESTAMP WITH TIME ZONE,
  withdrawal_count_hour INTEGER NOT NULL DEFAULT 0,
  withdrawal_count_day INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on withdrawal_limits
ALTER TABLE public.withdrawal_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for withdrawal_limits
CREATE POLICY "Users can view their own withdrawal limits" 
ON public.withdrawal_limits 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own withdrawal limits" 
ON public.withdrawal_limits 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own withdrawal limits" 
ON public.withdrawal_limits 
FOR UPDATE 
USING (user_id = auth.uid());

-- Add security events logging table
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_events
CREATE POLICY "Users can view their own security events" 
ON public.security_events 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- Add withdrawal attempt tracking
ALTER TABLE public.withdrawals 
ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 1,
ADD COLUMN last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN failure_reason TEXT;

-- Create function to check withdrawal limits
CREATE OR REPLACE FUNCTION public.check_withdrawal_limits(
  p_user_id UUID,
  p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_limits RECORD;
  v_hourly_total NUMERIC := 0;
  v_daily_total NUMERIC := 0;
  v_result JSONB;
BEGIN
  -- Get or create user limits
  SELECT * INTO v_limits 
  FROM public.withdrawal_limits 
  WHERE user_id = p_user_id;
  
  IF v_limits IS NULL THEN
    INSERT INTO public.withdrawal_limits (user_id) 
    VALUES (p_user_id) 
    RETURNING * INTO v_limits;
  END IF;
  
  -- Check hourly withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_hourly_total
  FROM public.withdrawals 
  WHERE user_id = p_user_id 
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status = 'completed';
    
  -- Check daily withdrawals  
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_total
  FROM public.withdrawals 
  WHERE user_id = p_user_id 
    AND created_at > NOW() - INTERVAL '1 day'
    AND status = 'completed';
  
  -- Return validation result
  v_result := jsonb_build_object(
    'allowed', (v_hourly_total + p_amount <= v_limits.hourly_limit AND 
                v_daily_total + p_amount <= v_limits.daily_limit),
    'hourly_used', v_hourly_total,
    'daily_used', v_daily_total,
    'hourly_limit', v_limits.hourly_limit,
    'daily_limit', v_limits.daily_limit
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for updating withdrawal_limits updated_at
CREATE TRIGGER update_withdrawal_limits_updated_at
BEFORE UPDATE ON public.withdrawal_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();