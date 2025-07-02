import { PaymentSessionStatus } from '@medusajs/framework/types';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { mnemonicToSeedSync } from 'bip39';
import crypto from 'crypto';
import { CurrencyConverter, DefaultConverter } from './currency-converter';
import { CoinGeckoConverter } from './coingecko-converter';

export type SolanaClientOptions = {
  rpcUrl: string;
  mnemonic: string;
  coldStorageWallet: string;
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
  expiration_date?: Date;
};

export class SolanaClient {
  private connection: Connection;
  private converter: CurrencyConverter;
  protected mnemonic: string;
  private coldStorageWallet: PublicKey;
  private seed: Buffer;

  constructor(options: SolanaClientOptions) {
    this.connection = new Connection(options.rpcUrl, 'confirmed');
    this.mnemonic = options.mnemonic;
    this.seed = mnemonicToSeedSync(this.mnemonic);
    this.coldStorageWallet = new PublicKey(options.coldStorageWallet);

    if (options.currencyConverter.provider === 'coingecko' && options.currencyConverter.apiKey) {
      this.converter = new CoinGeckoConverter(options.currencyConverter.apiKey);
    } else {
      this.converter = new DefaultConverter();
    }
  }

  private getOneTimeKeypair(paymentId: string): Keypair {
    const index = this.paymentIdToBip44Index(paymentId);
    const derivationPath = `m/44'/501'/${index}'/0'`;
    const derivedKey = derivePath(derivationPath, this.seed.toString('hex'));
    return Keypair.fromSeed(derivedKey.key.slice(0, 32));
  }

  async transferToColdStorage(paymentId: string): Promise<string> {
    const oneTimeKeypair = this.getOneTimeKeypair(paymentId);
    
    // Get balance of one-time address
    const balance = await this.connection.getBalance(oneTimeKeypair.publicKey);
    const numericBalance = Number(balance);

    // Create dummy transaction to estimate fee
    const dummyTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: oneTimeKeypair.publicKey,
        toPubkey: this.coldStorageWallet,
        lamports: numericBalance
      })
    );
    dummyTx.feePayer = oneTimeKeypair.publicKey;

    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    dummyTx.recentBlockhash = blockhash;
    const message = dummyTx.compileMessage();
    
    const feeInfo = await this.connection.getFeeForMessage(message);
    const fee = feeInfo.value;
    if (typeof fee !== 'number' || isNaN(fee)) {
      throw new Error('Failed to estimate transaction fee: ' + JSON.stringify(feeInfo));
    }
    const transferAmount = numericBalance - fee;

    if (transferAmount <= 0) {
      throw new Error('Insufficient balance to cover transaction fee');
    }

    // Create and send actual transaction
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.add(
      SystemProgram.transfer({
        fromPubkey: oneTimeKeypair.publicKey,
        toPubkey: this.coldStorageWallet,
        lamports: transferAmount
      })
    );
    tx.feePayer = oneTimeKeypair.publicKey;
    
    try {
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [oneTimeKeypair]
      );
      return signature;
    } catch (error) {
      throw new Error('Error transferring to cold storage:' + JSON.stringify({
        error: error,
        paymentId: paymentId,
        transaction: {
          from: oneTimeKeypair.publicKey.toBase58(),
          to: this.coldStorageWallet.toBase58(),
          amount: transferAmount,
          fee: fee
        }
      }));
    }
  }

  async convertToSol(amount: number, currencyCode: string): Promise<number> {
    return this.converter.convertToSol(amount, currencyCode);
  }

  paymentIdToBip44Index(paymentId: string): number {
    const hash = crypto.createHash('sha256').update(paymentId).digest();
    const rawIndex = hash.readUInt32BE(0);
    return rawIndex % 0x80000000;
  }

  generateAddress(paymentId: string): string {
    const index = this.paymentIdToBip44Index(paymentId);
    const derivationPath = `m/44'/501'/${index}'/0'`;
    const derivedKey = derivePath(derivationPath, this.seed.toString('hex'));
    const keypair = Keypair.fromSeed(derivedKey.key.slice(0, 32));
    return keypair.publicKey.toBase58();
  }

  async checkPayment(paymentDetails: PaymentDetails): Promise<boolean> {
    // console.log('Simulation accepted payment for:', JSON.stringify(paymentDetails, null, 2));
    // return true;
    try {
      const paymentAddress = new PublicKey(paymentDetails.solana_one_time_address);
      
      const signatures = await this.connection.getSignaturesForAddress(
        paymentAddress,
        { limit: 20 }
      );

      const createdAtDate = paymentDetails.created_at instanceof Date
        ? paymentDetails.created_at
        : new Date(paymentDetails.created_at);

      const relevantSignatures = signatures.filter((sig) => {
        if (!sig.blockTime) return false;
        const blockTimeDate = new Date(sig.blockTime * 1000);
        return blockTimeDate > createdAtDate;
      });
      
      for (const sig of relevantSignatures) {
        const tx = await this.connection.getParsedTransaction(sig.signature, { commitment: 'confirmed' });
        if (!tx || !tx.meta) continue;

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
