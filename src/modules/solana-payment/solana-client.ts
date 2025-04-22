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
import crypto from 'crypto';
import { CurrencyConverter, DefaultConverter } from './currency-converter';
import { CoinGeckoConverter } from './coingecko-converter';

export type SolanaClientOptions = {
  rpcUrl: string;
  mnemonic: string;
  currencyConverter: {
    provider: 'default' | 'coingecko';
    apiKey?: string;
  };
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
  private converter: CurrencyConverter;
  protected mnemonic: string;

  private seed: Buffer;

  constructor(options: SolanaClientOptions) {
    this.connection = new Connection(options.rpcUrl, 'confirmed');
    this.mnemonic = options.mnemonic;
    this.seed = mnemonicToSeedSync(this.mnemonic);

    // Initialize the appropriate currency converter
    if (options.converter) {
      this.converter = options.converter;
    } else {
      if (options.currencyConverter.provider === 'coingecko') {
        this.converter = new CoinGeckoConverter(options.currencyConverter.apiKey);
      } else {
        this.converter = new DefaultConverter();
      }
    }
  }

  /**
   * Convert fiat currency amount to SOL
   */
  async convertToSol(amount: number, currencyCode: string): Promise<number> {
    return this.converter.convertToSol(amount, currencyCode);
  }

  /**
   * Convert unique payment ID to BIP44 index
   */
  paymentIdToBip44Index(paymentId: string): number {
    const hash = crypto.createHash('sha256').update(paymentId).digest();
    return hash.readUInt32BE(0); // Use first 4 bytes as unsigned int
  }

  /**
   * Get the wallet address for receiving payments
   */
  generateAddress(paymentId: string): string {
    const index = this.paymentIdToBip44Index(paymentId);
    const derivationPath = `m/44'/501'/${index}'/0'`;
    console.log({ derivationPath, seed: this.seed.toString('hex'), mnemonic: this.mnemonic });
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
}

export default SolanaClient;
