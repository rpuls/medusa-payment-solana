import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { mnemonicToSeedSync } from 'bip39';
import { CurrencyConverter, DefaultConverter } from './currency-converter';

export type SolanaClientOptions = {
  rpcUrl: string;
  mnemonic: string;
  converter?: CurrencyConverter;
};

export type PaymentDetails = {
  id: string;
  amount: number;
  currency_code: string;
  sol_amount: number;
  solana_one_time_address: string;
  status: 'pending' | 'authorized' | 'captured' | 'canceled' | 'refunded';
  created_at: Date;
  updated_at: Date;
};

export class SolanaClient {
  private connection: Connection;
  private walletKeypair: Keypair;
  private converter: CurrencyConverter;
  protected mnemonic: string;

  private seed: Buffer;

  constructor(options: SolanaClientOptions) {
    this.connection = new Connection(options.rpcUrl, 'confirmed');
    this.converter = options.converter || new DefaultConverter();
    this.mnemonic = options.mnemonic;
    this.seed = mnemonicToSeedSync(this.mnemonic);

    // Derive master keypair from seed
    const derived = derivePath("m/44'/501'/0'/0'", this.seed.toString('hex'));
    this.walletKeypair = Keypair.fromSeed(derived.key);
  }

  /**
   * Convert fiat currency amount to SOL
   */
  async convertToSol(amount: number, currencyCode: string): Promise<number> {
    return this.converter.convertToSol(amount, currencyCode);
  }

  /**
   * Get the wallet address for receiving payments
   */

  generateAddress(index: number): string {
    const derivationPath = `m/44'/501'/${index}'/0'`;
    const derivedKey = derivePath(derivationPath, this.seed.toString('hex'));
    const keypair = Keypair.fromSeed(derivedKey.key.slice(0, 32));
    return keypair.publicKey.toBase58();
  }

  /**
   * Check if a payment has been received NOT TESTED!
   */
  async checkPayment(paymentDetails: PaymentDetails): Promise<boolean> {
    try {
      // Convert one-time address to PublicKey
      const paymentAddress = new PublicKey(paymentDetails.solana_one_time_address);
      
      // Get recent transactions to the wallet address
      const signatures = await this.connection.getSignaturesForAddress(
        paymentAddress,
        { limit: 10 }
      );

      // Filter signatures that occurred after the payment was created
      const relevantSignatures = signatures.filter(
        (sig) => new Date(sig.blockTime! * 1000) > paymentDetails.created_at
      );

      // Check each transaction to see if it matches our expected payment
      for (const sig of relevantSignatures) {
        const transaction = await this.connection.getTransaction(sig.signature);
        
        if (!transaction) continue;

        // Check if this transaction is a transfer to our wallet
        const transferInstruction = transaction.transaction.message.instructions.find(
          (ix) => {
            const programId = transaction.transaction.message.accountKeys[ix.programIdIndex].toString();
            return programId === SystemProgram.programId.toString();
          }
        );

        if (!transferInstruction) continue;

        // Check if the amount matches what we expect
        // This is a simplified check - in production you would need more robust verification
        const postBalance = transaction.meta?.postBalances?.[0] || 0;
        const preBalance = transaction.meta?.preBalances?.[0] || 0;
        const lamports = postBalance - preBalance;
        
        if (lamports > 0) {
          const solAmount = lamports / LAMPORTS_PER_SOL;
          
          // Allow a small margin of error (0.5%) to account for transaction fees
          const expectedAmount = paymentDetails.sol_amount;
          const minAcceptable = expectedAmount * 0.995;
          
          if (solAmount >= minAcceptable) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking payment:', error);
      return false;
    }
  }

  /**
   * For testing: Send SOL to simulate a payment
   * This would only be used in development/testing
   */
  async simulatePayment(recipient: string, amount: number): Promise<string | null> {
    if (!this.walletKeypair) {
      throw new Error('Wallet keypair not available for simulating payment');
    }

    try {
      const recipientPubkey = new PublicKey(recipient);
      const lamports = amount * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.walletKeypair.publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      const signature = await this.connection.sendTransaction(
        transaction,
        [this.walletKeypair]
      );

      await this.connection.confirmTransaction(signature, 'confirmed');
      return signature;
    } catch (error) {
      console.error('Error simulating payment:', error);
      return null;
    }
  }
}

export default SolanaClient;
