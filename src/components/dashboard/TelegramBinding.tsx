import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TelegramBindingProps {
  walletAddress?: string;
}

export const TelegramBinding: React.FC<TelegramBindingProps> = ({ walletAddress }) => {
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [isBinding, setIsBinding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (walletAddress) {
      loadTelegramBinding();
    }
  }, [walletAddress]);

  const loadTelegramBinding = async () => {
    if (!walletAddress) return;

    try {
      const { data, error } = await supabase
        .from('balances')
        .select('mobile_number, telegram_chat_id')
        .eq('wallet_address', walletAddress)
        .single();

      if (data) {
        setMobileNumber(data.mobile_number || '');
        setTelegramChatId(data.telegram_chat_id || '');
      }
    } catch (err) {
      console.log('No existing telegram binding found');
    }
  };

  const handleBindTelegram = async () => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!mobileNumber) {
      toast({
        title: "Mobile Number Required",
        description: "Please enter your mobile number",
        variant: "destructive",
      });
      return;
    }

    setIsBinding(true);

    try {
      // Create or update balance record with mobile number
      const { error } = await supabase
        .from('balances')
        .upsert({
          wallet_address: walletAddress,
          mobile_number: mobileNumber,
          balance: 0,
          usdc_balance: 0,
        });

      if (error) throw error;

      // Create Telegram deep link
      const botUsername = 'YourSniperBot'; // Replace with your actual bot username
      const deepLink = `https://t.me/${botUsername}?start=${encodeURIComponent(mobileNumber)}`;
      
      // Open Telegram
      window.open(deepLink, '_blank');

      toast({
        title: "Telegram Binding Started",
        description: "Please complete the binding in Telegram",
      });

    } catch (error) {
      console.error('Error binding telegram:', error);
      toast({
        title: "Binding Failed",
        description: "Failed to start Telegram binding",
        variant: "destructive",
      });
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">📱 Bind Telegram</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {telegramChatId ? (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-green-600">
              ✅ Telegram Connected
            </p>
            <p className="text-xs text-muted-foreground">
              Mobile: {mobileNumber}
            </p>
          </div>
        ) : (
          <>
            <Input
              type="tel"
              placeholder="Enter your mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="text-center"
            />
            
            <Button 
              onClick={handleBindTelegram}
              disabled={isBinding || !walletAddress}
              className="w-full"
            >
              {isBinding ? 'Binding...' : '📱 Bind Telegram'}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              This will open Telegram to complete the binding process
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};