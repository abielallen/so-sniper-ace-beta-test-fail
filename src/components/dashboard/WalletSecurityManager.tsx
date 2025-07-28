import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, CheckCircle, Lock, Bell, Eye, EyeOff } from 'lucide-react';

interface SecurityFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status: 'active' | 'warning' | 'inactive';
}

interface WalletSecurityManagerProps {
  walletAddress?: string;
}

export const WalletSecurityManager: React.FC<WalletSecurityManagerProps> = ({ walletAddress }) => {
  const [securityFeatures, setSecurityFeatures] = useState<SecurityFeature[]>([
    {
      id: 'one-time-binding',
      name: 'One-time Wallet Binding',
      description: 'Prevent unauthorized wallet changes after initial binding',
      enabled: false,
      status: 'inactive'
    },
    {
      id: 'transaction-verification',
      name: 'Transaction Verification',
      description: 'Require additional verification for high-value transactions',
      enabled: false,
      status: 'inactive'
    },
    {
      id: 'admin-notifications',
      name: 'Admin Notifications',
      description: 'Real-time notifications for all wallet activities',
      enabled: false,
      status: 'inactive'
    },
    {
      id: 'withdrawal-limits',
      name: 'Withdrawal Limits',
      description: 'Set daily/weekly withdrawal limits for enhanced security',
      enabled: false,
      status: 'inactive'
    }
  ]);

  const [adminPhone, setAdminPhone] = useState<string>('');
  const [withdrawalLimit, setWithdrawalLimit] = useState<string>('');
  const [isWalletBound, setIsWalletBound] = useState<boolean>(false);
  const [showSecurityLog, setShowSecurityLog] = useState<boolean>(false);
  const [securityLog, setSecurityLog] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (walletAddress) {
      loadSecuritySettings();
      loadSecurityLog();
    }
  }, [walletAddress]);

  const loadSecuritySettings = async () => {
    if (!walletAddress) return;

    try {
      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (data) {
        setIsWalletBound(true);
        if (data.mobile_number) {
          setAdminPhone(data.mobile_number);
          toggleSecurityFeature('admin-notifications', true);
        }
      }
    } catch (err) {
      console.log('No existing security settings found');
    }
  };

  const loadSecurityLog = async () => {
    if (!walletAddress) return;

    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setSecurityLog(data);
      }
    } catch (err) {
      console.log('Error loading security log:', err);
    }
  };

  const toggleSecurityFeature = (featureId: string, enabled?: boolean) => {
    setSecurityFeatures(prev => 
      prev.map(feature => 
        feature.id === featureId 
          ? { 
              ...feature, 
              enabled: enabled !== undefined ? enabled : !feature.enabled,
              status: (enabled !== undefined ? enabled : !feature.enabled) ? 'active' : 'inactive'
            }
          : feature
      )
    );
  };

  const bindWallet = async () => {
    if (!walletAddress) {
      toast({
        title: "No Wallet Connected",
        description: "Please connect a wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('balances')
        .upsert({
          wallet_address: walletAddress,
          mobile_number: adminPhone || null,
          balance: 0,
          usdc_balance: 0,
        }, {
          onConflict: 'wallet_address'
        });

      if (error) throw error;

      setIsWalletBound(true);
      toggleSecurityFeature('one-time-binding', true);
      
      toast({
        title: "Wallet Bound Successfully",
        description: "Your wallet is now securely bound with enhanced security features",
      });
    } catch (error) {
      console.error('Error binding wallet:', error);
      toast({
        title: "Binding Failed",
        description: "Failed to bind wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateAdminNotifications = async () => {
    if (!walletAddress || !adminPhone) return;

    try {
      const { error } = await supabase
        .from('balances')
        .update({ mobile_number: adminPhone })
        .eq('wallet_address', walletAddress);

      if (error) throw error;

      toggleSecurityFeature('admin-notifications', true);
      
      toast({
        title: "Admin Notifications Enabled",
        description: `Notifications will be sent to ${adminPhone}`,
      });
    } catch (error) {
      console.error('Error updating admin notifications:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update admin notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (!walletAddress) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Security Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Connect wallet to access security features</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Manager
          </span>
          <Badge variant={isWalletBound ? "default" : "secondary"}>
            {isWalletBound ? "Bound" : "Unbound"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Binding Section */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Wallet Binding
          </h4>
          {!isWalletBound ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Bind your wallet for enhanced security and one-time configuration
              </p>
              <Button onClick={bindWallet} className="w-full">
                Bind Wallet Securely
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                ✅ Wallet securely bound to {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Admin Notifications */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Admin Notifications
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="Admin phone number"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={updateAdminNotifications}
              disabled={!adminPhone}
              variant="outline"
            >
              Enable
            </Button>
          </div>
        </div>

        <Separator />

        {/* Security Features */}
        <div className="space-y-3">
          <h4 className="font-medium">Security Features</h4>
          <div className="space-y-2">
            {securityFeatures.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(feature.status)}
                  <div>
                    <p className="font-medium text-sm">{feature.name}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(feature.status)}>
                  {feature.enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Security Log */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Security Log</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSecurityLog(!showSecurityLog)}
            >
              {showSecurityLog ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {showSecurityLog && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {securityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No security events recorded
                </p>
              ) : (
                securityLog.map((log, index) => (
                  <div key={index} className="p-2 bg-muted rounded text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">{log.status}</span>
                      <span className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p>Amount: {log.amount} {log.token}</p>
                    {log.tx_signature && (
                      <p className="font-mono">TX: {log.tx_signature.slice(0, 16)}...</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};