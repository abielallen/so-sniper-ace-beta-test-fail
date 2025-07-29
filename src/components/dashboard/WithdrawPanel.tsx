import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WithdrawPanelProps {
  walletAddress?: string;
  solBalance?: number;
  usdcBalance?: number;
}

export const WithdrawPanel: React.FC<WithdrawPanelProps> = ({ 
  walletAddress
}) => {
  const [amount, setAmount] = useState<string>('');
  const [token, setToken] = useState<'SOL' | 'USDC'>('SOL');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [lastTxSignature, setLastTxSignature] = useState<string>('');
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const { toast } = useToast();
  const { user, session } = useAuth();

  // Load balance data
  useEffect(() => {
    if (walletAddress) {
      loadBalance();
      const cleanup = setupRealtimeUpdates();
      return cleanup;
    }
  }, [walletAddress]);

  const loadBalance = async () => {
    if (!walletAddress || !user) return;

    try {
      const { data, error } = await supabase
        .from('balances')
        .select('balance, usdc_balance')
        .eq('wallet_address', walletAddress)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSolBalance(Number(data.balance) || 0);
        setUsdcBalance(Number(data.usdc_balance) || 0);
      }
    } catch (err) {
      console.log('No balance record found');
    }
  };

  const setupRealtimeUpdates = () => {
    if (!walletAddress) return;

    const channel = supabase
      .channel('withdraw-balance-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'balances',
          filter: `wallet_address=eq.${walletAddress}`
        },
        (payload) => {
          const newData = payload.new as any;
          setSolBalance(Number(newData.balance) || 0);
          setUsdcBalance(Number(newData.usdc_balance) || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleWithdraw = async () => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const maxBalance = token === 'SOL' ? (solBalance || 0) : (usdcBalance || 0);
    if (Number(amount) > maxBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Maximum available: ${maxBalance.toFixed(4)} ${token}`,
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);

    try {
      // Get mobile number for the withdrawal
      const { data: balanceData } = await supabase
        .from('balances')
        .select('mobile_number')
        .eq('wallet_address', walletAddress)
        .single();

      // Call the withdraw edge function with auth header
      const { data, error } = await supabase.functions.invoke('withdraw', {
        body: {
          walletAddress,
          amount: Number(amount),
          token,
          mobileNumber: balanceData?.mobile_number
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setLastTxSignature(data.signature);
        setAmount('');
        
        toast({
          title: "Withdrawal Successful",
          description: `${amount} ${token} sent to your wallet`,
        });
      } else {
        throw new Error(data.error || 'Withdrawal failed');
      }

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getSolscanUrl = (signature: string) => {
    return `https://solscan.io/tx/${signature}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">💸 Withdraw</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.0001"
              min="0"
            />
          </div>
          <Select value={token} onValueChange={(value: 'SOL' | 'USDC') => setToken(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOL">SOL</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Available: {token === 'SOL' ? (solBalance || 0).toFixed(4) : (usdcBalance || 0).toFixed(2)} {token}
        </div>

        <Button 
          onClick={handleWithdraw}
          disabled={isWithdrawing || !walletAddress || !amount}
          className="w-full"
        >
          {isWithdrawing ? 'Processing...' : `Withdraw ${token}`}
        </Button>

        {lastTxSignature && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">✅ Last Transaction</p>
            <a 
              href={getSolscanUrl(lastTxSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              {lastTxSignature}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};