
import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { TokenDetectionTable } from "@/components/dashboard/TokenDetectionTable";
import { TradeHistoryTable } from "@/components/dashboard/TradeHistoryTable";
import { PerformanceStatsDisplay } from "@/components/dashboard/PerformanceStats";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { BotConfigPanel } from "@/components/dashboard/BotConfigPanel";
import { CurrentTrade } from "@/components/dashboard/CurrentTrade";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  ArrowTrendingUp, 
  Laptop, 
  Loader2, 
  Search, 
  ShieldCheck, 
  Clock, 
  LineChart 
} from "lucide-react";

// Import mock data for UI demo
import { 
  mockTokens, 
  mockTradeHistory, 
  mockBalanceHistory, 
  mockTokenDetections, 
  mockBotConfig, 
  mockPerformanceStats 
} from "@/lib/mockData";
import { BotConfig, TradeHistory } from "@/types/sniperBot";

const Index = () => {
  const { toast } = useToast();
  const [botActive, setBotActive] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig>(mockBotConfig);
  const [tokenDetections, setTokenDetections] = useState(mockTokenDetections);
  const [tradeHistory, setTradeHistory] = useState(mockTradeHistory);
  const [activeTrade, setActiveTrade] = useState<TradeHistory | null>(
    mockTradeHistory.find(trade => trade.status === "active") || null
  );
  
  const toggleBot = () => {
    const newState = !botActive;
    setBotActive(newState);
    
    toast({
      title: newState ? "Bot Started" : "Bot Stopped",
      description: newState 
        ? "The sniper bot is now running and monitoring for new tokens" 
        : "The sniper bot has been stopped",
      variant: newState ? "default" : "destructive",
    });
    
    if (newState) {
      // Simulate a new token detection after bot start
      setTimeout(() => {
        const newDetection = {
          id: (Math.random() * 1000).toFixed(0),
          tokenName: "SolanaGem",
          tokenSymbol: "GEM",
          initialLiquidity: 4500,
          timestamp: new Date(),
          status: "detected" as const,
          safetyScore: 78,
          processing: true
        };
        
        setTokenDetections(prev => [newDetection, ...prev]);
        
        toast({
          title: "New Token Detected!",
          description: `${newDetection.tokenName} (${newDetection.tokenSymbol}) - Safety Score: ${newDetection.safetyScore}`,
        });
      }, 5000);
    }
  };
  
  const handleSaveConfig = (newConfig: BotConfig) => {
    setBotConfig(newConfig);
    toast({
      title: "Configuration Saved",
      description: "Bot configuration has been updated successfully",
    });
  };
  
  const handleSellNow = () => {
    if (!activeTrade) return;
    
    // Calculate final profit
    const profit = 48.5; // Example fixed profit
    const sellAmount = activeTrade.buyAmount * (1 + profit/100);
    
    const updatedTrade = {
      ...activeTrade,
      sellAmount,
      sellPrice: activeTrade.buyPrice * (1 + profit/100),
      profit,
      status: "completed" as const
    };
    
    // Update trade history
    setTradeHistory(prev => 
      prev.map(trade => 
        trade.id === activeTrade.id ? updatedTrade : trade
      )
    );
    
    // Clear active trade
    setActiveTrade(null);
    
    toast({
      title: "Trade Sold",
      description: `Sold ${activeTrade.tokenName} with ${profit.toFixed(1)}% profit`,
      variant: "default",
    });
  };
  
  return (
    <div className="min-h-screen bg-solana-darkblue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Header 
          activeBalance={mockPerformanceStats.activeBalance} 
          botActive={botActive} 
          onToggleBot={toggleBot} 
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Card className="dashboard-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Live Token Detections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <StatusCard
                    title="Status"
                    value={botActive ? "Running" : "Stopped"}
                    icon={botActive 
                      ? <Loader2 className="h-5 w-5 text-green-500 animate-spin" /> 
                      : <Laptop className="h-5 w-5 text-yellow-500" />}
                    status={botActive ? "success" : "warning"}
                  />
                  <StatusCard
                    title="Tokens Analyzed"
                    value="243"
                    icon={<Search className="h-5 w-5 text-blue-500" />}
                    status="info"
                    trendLabel="this week"
                  />
                  <StatusCard
                    title="Safety Rating"
                    value="92%"
                    icon={<ShieldCheck className="h-5 w-5 text-green-500" />}
                    status="success"
                    trendLabel="accuracy"
                  />
                </div>
                <TokenDetectionTable detections={tokenDetections} />
              </CardContent>
            </Card>
          </div>
          
          <div>
            <CurrentTrade 
              activeTrade={activeTrade} 
              onSellNow={handleSellNow}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <PerformanceStatsDisplay stats={mockPerformanceStats} />
          </div>
          
          <div>
            <BalanceChart data={mockBalanceHistory} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mb-6">
          <Tabs defaultValue="trades" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Activity & Settings</h2>
              <TabsList>
                <TabsTrigger value="trades">
                  <LineChart className="h-4 w-4 mr-1" />
                  Trade History
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-1" />
                  Bot Settings
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="trades">
              <Card className="dashboard-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium">Recent Trades</CardTitle>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Last updated: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TradeHistoryTable trades={tradeHistory} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings">
              <BotConfigPanel 
                config={botConfig}
                onSave={handleSaveConfig}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Missing components
const ArrowTrendingUp = ({ className }: { className?: string }) => {
  return <div className={className}>📈</div>;
};

const Settings = ({ className }: { className?: string }) => {
  return <div className={className}>⚙️</div>;
};

export default Index;
