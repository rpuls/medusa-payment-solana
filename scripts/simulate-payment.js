/**
 * This script simulates a Solana payment for testing purposes.
 * It creates a payment session and then simulates a payment being sent to the wallet.
 * 
 * Usage:
 * node scripts/simulate-payment.js
 */

require('dotenv').config();
const { Connection, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Mock payment session data
const paymentSession = {
  id: 'test_payment_' + Date.now(),
  amount: 100, // $100
  currency_code: 'USD',
  sol_amount: 5, // 5 SOL (assuming 1 USD = 0.05 SOL)
  wallet_address: process.env.SOLANA_ADDRESS,
  status: 'pending',
  created_at: new Date(),
  updated_at: new Date(),
};

// Function to load wallet keypair
function loadWalletKeypair() {
  try {
    const keypairPath = path.resolve('wallet-keypair.json');
    const keypairData = fs.readFileSync(keypairPath, 'utf-8');
    const secretKey = Uint8Array.from(JSON.parse(keypairData));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('Failed to load wallet keypair:', error);
    process.exit(1);
  }
}

// Function to simulate a payment
async function simulatePayment() {
  console.log('Simulating Solana payment...');
  console.log('Payment details:', {
    id: paymentSession.id,
    amount: `${paymentSession.amount} ${paymentSession.currency_code}`,
    sol_amount: paymentSession.sol_amount,
    wallet_address: paymentSession.wallet_address,
  });

  // Connect to Solana testnet
  const connection = new Connection('https://api.testnet.solana.com', 'confirmed');
  
  // Load the sender's keypair
  const senderKeypair = loadWalletKeypair();
  
  // Check sender's balance
  const senderBalance = await connection.getBalance(senderKeypair.publicKey);
  console.log(`Sender's balance: ${senderBalance / LAMPORTS_PER_SOL} SOL`);
  
  if (senderBalance < paymentSession.sol_amount * LAMPORTS_PER_SOL) {
    console.error('Insufficient balance to simulate payment');
    console.log('Please fund your wallet using the Solana testnet faucet:');
    console.log('https://faucet.solana.com/');
    process.exit(1);
  }
  
  try {
    // Import the SolanaClient to use its simulatePayment method
    const SolanaClient = require('../dist/modules/solana-payment/solana-client').default;
    
    const solanaClient = new SolanaClient({
      rpcUrl: 'https://api.testnet.solana.com',
      walletAddress: process.env.SOLANA_ADDRESS,
      walletKeypairPath: 'wallet-keypair.json',
    });
    
    // Simulate the payment
    const signature = await solanaClient.simulatePayment(
      paymentSession.wallet_address,
      paymentSession.sol_amount
    );
    
    if (signature) {
      console.log('Payment simulation successful!');
      console.log('Transaction signature:', signature);
      console.log('View transaction on Solana Explorer:');
      console.log(`https://explorer.solana.com/tx/${signature}?cluster=testnet`);
    } else {
      console.error('Payment simulation failed');
    }
  } catch (error) {
    console.error('Error simulating payment:', error);
  }
}

// Run the simulation
simulatePayment().catch(console.error);
