-- Create missing wallet_bindings table for secure wallet management
CREATE TABLE public.wallet_bindings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  user_id UUID NOT NULL,
  bound_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  security_level TEXT NOT NULL DEFAULT 'standard',
  last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(wallet_address, user_id)
);

-- Enable RLS
ALTER TABLE public.wallet_bindings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own wallet bindings" 
ON public.wallet_bindings 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallet bindings" 
ON public.wallet_bindings 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet bindings" 
ON public.wallet_bindings 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own wallet bindings" 
ON public.wallet_bindings 
FOR DELETE 
USING (user_id = auth.uid());

-- Create admin_notifications table for security settings
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  sms_notifications BOOLEAN NOT NULL DEFAULT false,
  telegram_notifications BOOLEAN NOT NULL DEFAULT false,
  security_alerts BOOLEAN NOT NULL DEFAULT true,
  withdrawal_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS for admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_notifications
CREATE POLICY "Users can view their own admin notifications" 
ON public.admin_notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own admin notifications" 
ON public.admin_notifications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own admin notifications" 
ON public.admin_notifications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own admin notifications" 
ON public.admin_notifications 
FOR DELETE 
USING (user_id = auth.uid());

-- Add triggers for updated_at columns
CREATE TRIGGER update_wallet_bindings_updated_at
BEFORE UPDATE ON public.wallet_bindings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_notifications_updated_at
BEFORE UPDATE ON public.admin_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();