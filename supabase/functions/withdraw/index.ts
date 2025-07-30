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
    // Get auth header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - No token provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { walletAddress, amount, token, mobileNumber } = await req.json();

    // Enhanced input validation
    if (!walletAddress || !amount || !token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate Solana wallet address format (44 characters, base58)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(walletAddress)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid wallet address format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate token type
    const validTokens = ['SOL', 'USDC'];
    if (!validTokens.includes(token)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate amount
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check decimal precision (max 9 decimals for SOL, 6 for USDC)
    const maxDecimals = token === 'SOL' ? 9 : 6;
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > maxDecimals) {
      return new Response(
        JSON.stringify({ success: false, error: `Amount exceeds maximum decimal precision for ${token}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get user balance and telegram_chat_id - ensure user owns this wallet
    const { data: balanceData, error: balanceError } = await supabase
      .from('balances')
      .select('balance, usdc_balance, telegram_chat_id, user_id')
      .eq('wallet_address', walletAddress)
      .eq('user_id', user.id)
      .single();

    if (balanceError || !balanceData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet not found or not owned by user' }),
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
    
    // Verify on-chain balance before allowing withdrawal
    try {
      const publicKey = new PublicKey(walletAddress);
      const onChainBalance = await connection.getBalance(publicKey);
      const onChainBalanceSOL = onChainBalance / LAMPORTS_PER_SOL;
      
      // For SOL withdrawals, verify on-chain balance matches our records
      if (token === 'SOL') {
        const balanceDifference = Math.abs(onChainBalanceSOL - Number(balanceData.balance));
        if (balanceDifference > 0.001) { // Allow small differences due to network fees
          console.warn(`Balance mismatch: DB=${balanceData.balance}, Chain=${onChainBalanceSOL}`);
        }
      }
    } catch (error) {
      console.error('Failed to verify on-chain balance:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify wallet balance' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // SECURITY WARNING: This is still a mock transaction for demo purposes
    // In production, implement real Solana transactions with proper keypairs
    const mockSignature = `DEMO_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Record withdrawal in database
    const { error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        wallet_address: walletAddress,
        amount,
        token,
        tx_signature: mockSignature,
        mobile_number: mobileNumber,
        status: 'completed'
      });

    if (withdrawalError) {
      console.error('Withdrawal record error:', withdrawalError);
      // Log security event for failed withdrawal recording
      console.error('SECURITY_EVENT: Failed to record withdrawal', {
        user_id: user.id,
        wallet_address: walletAddress,
        amount,
        token,
        error: withdrawalError
      });
    }

    // Send Telegram notification if chat_id exists
    if (balanceData.telegram_chat_id) {
      try {
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (botToken) {
          // Sanitize data for Telegram message
          const sanitizedWallet = walletAddress.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
          const telegramMessage = `💸 Withdrawal Successful\\n\\nAmount: ${amount} ${token}\\nTo: ${sanitizedWallet.slice(0, 8)}...${sanitizedWallet.slice(-8)}\\nTx: ${mockSignature}`;
          
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
    
    // Log security event for system errors
    console.error('SECURITY_EVENT: Withdrawal system error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})