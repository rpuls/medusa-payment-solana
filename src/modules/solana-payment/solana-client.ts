import { PaymentSessionStatus } from '@medusajs/framework/types';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
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
};

export type PaymentDetails = {
  id: string;
  amount: number;
  currency_code: string;
  sol_amount: number;
  solana_one_time_address: string;
  status: PaymentSessionStatus;
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
    if (options.currencyConverter.provider === 'coingecko' && options.currencyConverter.apiKey) {
      this.converter = new CoinGeckoConverter(options.currencyConverter.apiKey);
    } else {
      this.converter = new DefaultConverter();
    }
  }

  /**
   * Convert fiat currency amount to SOL
   */
  async convertToSol(amount: number, currencyCode: string): Promise<number> {
    return this.converter.convertToSol(amount, currencyCode);
  }

  /**
   * Convert payment ID to a valid BIP44 index (31-bit for hardened paths)
   */
  paymentIdToBip44Index(paymentId: string): number {
    const hash = crypto.createHash('sha256').update(paymentId).digest();
    const rawIndex = hash.readUInt32BE(0); // 0 to 4294967295
    return rawIndex % 0x80000000; // 0 to 2147483647
  }

  /**
   * Generate a unique Solana address for a payment
   */
  generateAddress(paymentId: string): string {
    const index = this.paymentIdToBip44Index(paymentId);
    const derivationPath = `m/44'/501'/${index}'/0'`; // Hardened path
    const derivedKey = derivePath(derivationPath, this.seed.toString('hex'));
    const keypair = Keypair.fromSeed(derivedKey.key.slice(0, 32));
    return keypair.publicKey.toBase58();
  }

  /**
   * Check if a payment has been received
   * Eventually, this needs to be more sophisticated and return the received amount to; trigger auto refund if overpaid, or sent "requires_more" if underpaid, and update the payment session status accordingly
   */
  async checkPayment(paymentDetails: PaymentDetails): Promise<boolean> {
    try {
      const paymentAddress = new PublicKey(paymentDetails.solana_one_time_address);
      
      // Fetch recent signatures
      const signatures = await this.connection.getSignaturesForAddress(
        paymentAddress,
        { limit: 20 }
      );

      // Ensure paymentDetails.created_at is a Date object
      const createdAtDate = paymentDetails.created_at instanceof Date
        ? paymentDetails.created_at
        : new Date(paymentDetails.created_at);

      // Filter signatures after payment creation time
      const relevantSignatures = signatures.filter((sig) => {
        if (!sig.blockTime) return false;
        const blockTimeDate = new Date(sig.blockTime * 1000);
        return blockTimeDate > createdAtDate;
      });
      
      for (const sig of relevantSignatures) {
        // Fetch transaction details (parsed for easier inspection)
        const tx = await this.connection.getParsedTransaction(sig.signature, { commitment: 'confirmed' });
        if (!tx || !tx.meta) continue;

        // Check each instruction for a matching SystemProgram transfer
        for (const ix of tx.transaction.message.instructions) {
          if (
            'program' in ix &&
            ix.program === 'system' &&
            ix.parsed?.type === 'transfer'
          ) {
            const info = ix.parsed.info;
            if (
              info.destination === paymentAddress.toBase58() &&
              Number(info.lamports) === paymentDetails.sol_amount * LAMPORTS_PER_SOL
            ) {
              // Found a matching payment!
              return true;
            }
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
