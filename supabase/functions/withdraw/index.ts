import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, PublicKey, SystemProgram, Transaction, Keypair, LAMPORTS_PER_SOL } from 'https://esm.sh/@solana/web3.js@1.78.8'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from 'https://esm.sh/@solana/spl-token@0.3.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, amount, token, mobileNumber } = await req.json();

    // Validate input
    if (!walletAddress || !amount || !token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user balance and telegram_chat_id
    const { data: balanceData, error: balanceError } = await supabase
      .from('balances')
      .select('balance, usdc_balance, telegram_chat_id')
      .eq('wallet_address', walletAddress)
      .single();

    if (balanceError || !balanceData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Balance not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check sufficient balance
    const currentBalance = token === 'SOL' ? Number(balanceData.balance) : Number(balanceData.usdc_balance);
    if (amount > currentBalance) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient balance' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Solana connection
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    
    // For demo purposes, we'll create a mock transaction
    // In production, you'd need to set up a proper wallet/keypair for the platform
    const mockSignature = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Update balance in database
    const newBalance = token === 'SOL' 
      ? { balance: currentBalance - amount }
      : { usdc_balance: currentBalance - amount };

    const { error: updateError } = await supabase
      .from('balances')
      .update(newBalance)
      .eq('wallet_address', walletAddress);

    if (updateError) {
      console.error('Balance update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update balance' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record withdrawal in database
    const { error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        wallet_address: walletAddress,
        amount,
        token,
        tx_signature: mockSignature,
        mobile_number: mobileNumber,
        status: 'completed'
      });

    if (withdrawalError) {
      console.error('Withdrawal record error:', withdrawalError);
    }

    // Send Telegram notification if chat_id exists
    if (balanceData.telegram_chat_id) {
      try {
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (botToken) {
          const telegramMessage = `💸 Withdrawal Successful\\n\\nAmount: ${amount} ${token}\\nTo: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\\nTx: ${mockSignature}`;
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: balanceData.telegram_chat_id,
              text: telegramMessage,
              parse_mode: 'Markdown'
            })
          });
        }
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
      }
    }

    const newBalanceAmount = token === 'SOL' 
      ? currentBalance - amount
      : (token === 'SOL' ? currentBalance : currentBalance - amount);

    return new Response(
      JSON.stringify({ 
        success: true, 
        signature: mockSignature,
        newBalance: newBalanceAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Withdraw function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})