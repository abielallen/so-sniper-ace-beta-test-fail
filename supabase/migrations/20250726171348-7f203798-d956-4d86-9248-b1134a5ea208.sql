-- Create balances table for tracking user balances
CREATE TABLE public.balances (
  wallet_address TEXT PRIMARY KEY,
  balance NUMERIC NOT NULL DEFAULT 0,
  usdc_balance NUMERIC NOT NULL DEFAULT 0,
  mobile_number TEXT,
  telegram_chat_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Create policies for balances
CREATE POLICY "Users can view their own balance" 
ON public.balances 
FOR SELECT 
USING (true); -- Public read for now, can be restricted later

CREATE POLICY "Users can update their own balance" 
ON public.balances 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can insert their own balance" 
ON public.balances 
FOR INSERT 
WITH CHECK (true);

-- Create withdrawals table for tracking withdrawal history
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token TEXT NOT NULL CHECK (token IN ('SOL', 'USDC')),
  tx_signature TEXT NOT NULL,
  mobile_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies for withdrawals
CREATE POLICY "Users can view all withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert withdrawals" 
ON public.withdrawals 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_balances_updated_at
    BEFORE UPDATE ON public.balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();