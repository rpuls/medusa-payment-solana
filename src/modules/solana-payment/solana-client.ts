import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

export type SolanaClientOptions = {
  rpcUrl: string;
  walletAddress: string;
  walletKeypairPath?: string;
};

export type PaymentDetails = {
  id: string;
  amount: number;
  currency_code: string;
  sol_amount: number;
  wallet_address: string;
  status: "pending" | "authorized" | "captured" | "canceled" | "refunded";
  created_at: Date;
  updated_at: Date;
};

export class SolanaClient {
  private connection: Connection;
  private walletAddress: PublicKey;
  private walletKeypair?: Keypair;
  
  // Placeholder conversion rates - in a real implementation, these would be fetched from an API
  private conversionRates = {
    USD: 0.05, // 1 USD = 0.05 SOL
    EUR: 0.055, // 1 EUR = 0.055 SOL
  };

  constructor(options: SolanaClientOptions) {
    this.connection = new Connection(options.rpcUrl, "confirmed");
    this.walletAddress = new PublicKey(options.walletAddress);

    // Load wallet keypair if provided (for testing)
    if (options.walletKeypairPath) {
      try {
        const keypairData = fs.readFileSync(
          path.resolve(options.walletKeypairPath),
          "utf-8"
        );
        const secretKey = Uint8Array.from(JSON.parse(keypairData));
        this.walletKeypair = Keypair.fromSecretKey(secretKey);
      } catch (error) {
        console.error("Failed to load wallet keypair:", error);
      }
    }
  }

  /**
   * Convert fiat currency amount to SOL
   */
  convertToSol(amount: number, currencyCode: string): number {
    const rate = this.conversionRates[currencyCode as keyof typeof this.conversionRates] || 0.05;
    // TODO: In a production environment, fetch real-time conversion rates from an API
    return parseFloat((amount * rate).toFixed(9));
  }

  /**
   * Get the wallet address for receiving payments
   */
  getWalletAddress(): string {
    return this.walletAddress.toString();
  }

  /**
   * Check if a payment has been received
   */
  async checkPayment(paymentDetails: PaymentDetails): Promise<boolean> {
    try {
      // Get recent transactions to the wallet address
      const signatures = await this.connection.getSignaturesForAddress(
        this.walletAddress,
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
      console.error("Error checking payment:", error);
      return false;
    }
  }

  /**
   * For testing: Send SOL to simulate a payment
   * This would only be used in development/testing
   */
  async simulatePayment(recipient: string, amount: number): Promise<string | null> {
    if (!this.walletKeypair) {
      throw new Error("Wallet keypair not available for simulating payment");
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

      await this.connection.confirmTransaction(signature, "confirmed");
      return signature;
    } catch (error) {
      console.error("Error simulating payment:", error);
      return null;
    }
  }
}

export default SolanaClient;
