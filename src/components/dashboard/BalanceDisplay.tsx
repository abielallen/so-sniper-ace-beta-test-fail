import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface BalanceDisplayProps {
  walletAddress?: string;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ walletAddress }) => {
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      loadBalance();
      setupRealtimeUpdates();
    }
  }, [walletAddress]);

  const loadBalance = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('balances')
        .select('balance, usdc_balance')
        .eq('wallet_address', walletAddress)
        .single();

      if (data) {
        setSolBalance(Number(data.balance) || 0);
        setUsdcBalance(Number(data.usdc_balance) || 0);
      }
    } catch (err) {
      console.log('No balance record found, initializing...');
      // Initialize balance record
      await supabase
        .from('balances')
        .upsert({
          wallet_address: walletAddress,
          balance: 0,
          usdc_balance: 0,
        });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeUpdates = () => {
    if (!walletAddress) return;

    const channel = supabase
      .channel('balance-updates')
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

  if (!walletAddress) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">💰 Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Connect wallet to view balance</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">💰 Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold">{solBalance.toFixed(4)}</div>
              <div className="text-sm text-muted-foreground">SOL</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold">{usdcBalance.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">USDC</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};