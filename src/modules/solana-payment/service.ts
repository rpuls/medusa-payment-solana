import { AbstractPaymentProvider } from '@medusajs/framework/utils';
import { 
  Logger,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult
} from '@medusajs/framework/types';
import { SolanaPaymentError } from './errors';
import SolanaClient, { PaymentDetails } from './solana-client';
import { generatePaymentId, createPaymentDescription } from './utils';

// Extend PaymentSessionStatus to include 'refunded'
// type ExtendedPaymentSessionStatus = PaymentSessionStatus | 'refunded';

// Define a custom context type that includes order_id
type CustomPaymentContext = {
  order_id?: string;
  [key: string]: unknown;
};

type SolanaPaymentOptions = {
  rpcUrl: string;
  passPhrase: string;
  coldStorageWallet: string;
  sessionExpirationSeconds?: number;
  currencyConverter?: {
    provider: 'default' | 'coingecko';
    apiKey?: string;
  };
};

class SolanaPaymentProviderService extends AbstractPaymentProvider<SolanaPaymentOptions> {
  static identifier = 'solana';
  
  protected logger_: Logger;
  protected options_: SolanaPaymentOptions;
  protected solanaClient!: SolanaClient;

  async initialize() {
    this.solanaClient = new SolanaClient({
      rpcUrl: this.options_.rpcUrl,
      mnemonic: this.options_.passPhrase,
      coldStorageWallet: this.options_.coldStorageWallet,
      currencyConverter: {
        provider: this.options_.currencyConverter?.provider || 'default',
        apiKey: this.options_.currencyConverter?.apiKey
      }
    });
  }

  constructor(
    container: { logger: Logger },
    options: SolanaPaymentOptions
  ) {
    super(container, options);

    this.logger_ = container.logger;
    this.options_ = options;
    
    // Initialize the provider asynchronously
    this.initialize().catch(error => {
      this.logger_.error(`Error initializing Solana payment provider: ${error}`);
      throw error;
    });
  }

  /**
   * Validate the options provided to the payment provider
   */
  static validateOptions(options: Record<string, unknown>): void {
    if (!options.passPhrase) {
      throw new SolanaPaymentError(
        SolanaPaymentError.Types.INVALID_DATA,
        'Solana mnemonic phrase is required'
      );
    }
  }

  /**
   * Initialize a new payment session
   */
  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    try {
      const { amount, currency_code, context } = input;
      this.logger_.info('Initiating Solana payment with amount: ' + amount + ' and currency: ' + currency_code);
      // Generate a unique payment ID
      const paymentId = generatePaymentId();
      
      // Convert the amount to SOL
      const solAmount = await this.solanaClient.convertToSol(Number(amount), currency_code);
      this.logger_.info(`Converted ${amount} ${currency_code} to ${solAmount} SOL`);
      
  
      const solana_one_time_address = this.solanaClient.generateAddress(paymentId);
      
      // Calculate expiration timestamp based on configuration
      const expirationSeconds = this.options_.sessionExpirationSeconds || 60 * 5; // Default to 5 minutes if not set
      const expirationDate = new Date();
      expirationDate.setSeconds(expirationDate.getSeconds() + expirationSeconds);
      
      // Create payment details
      const paymentDetails: PaymentDetails = {
        id: paymentId,
        amount: Number(amount),
        currency_code,
        sol_amount: solAmount,
        received_sol_amount: 0,
        solana_one_time_address,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        expiration_date: expirationDate
      };
      
      this.logger_.info('Created payment details:' + JSON.stringify(paymentDetails));
      
      // Create a description for the payment
      const customContext = context as CustomPaymentContext;
      const description = createPaymentDescription(
        customContext?.order_id || 'unknown',
        Number(amount),
        currency_code,
        solAmount
      );
      
      this.logger_.info(`Initiated Solana payment: ${paymentId} for ${solAmount} SOL`);
      
      // Return with additional data that will be stored with the payment session
      return {
        id: paymentId,
        data: {
          ...paymentDetails,
          description,
        },
      };
    } catch (error) {
      this.logger_.error(`Error initiating Solana payment: ${error}`);
      throw error;
    }
  }

  /**
   * Renews the payment details with a new price and expiration date.
   */
  async renewPayment(paymentDetails: PaymentDetails): Promise<PaymentDetails> {
    this.logger_.info(`Renewing payment session: ${paymentDetails.id}`);
    
    // Update the price to the current conversion rate
    const newSolAmount = await this.solanaClient.convertToSol(paymentDetails.amount, paymentDetails.currency_code);
    this.logger_.info(`Updated price for ${paymentDetails.id} from ${paymentDetails.sol_amount} SOL to ${newSolAmount} SOL`);
    
    // Calculate a new expiration timestamp
    const expirationSeconds = this.options_.sessionExpirationSeconds || 60 * 5; // Default to 5 minutes
    const newExpirationDate = new Date();
    newExpirationDate.setSeconds(newExpirationDate.getSeconds() + expirationSeconds);
    
    const updatedDetails: PaymentDetails = {
      ...paymentDetails,
      sol_amount: newSolAmount,
      updated_at: new Date(),
      expiration_date: newExpirationDate,
      status: 'pending' // Reset status to pending
    };
    
    return updatedDetails;
  }

  /**
   * Authorize a payment
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    try {
      const { data } = input;
      if (!data) {
        throw new SolanaPaymentError(
          SolanaPaymentError.Types.INVALID_DATA,
          'No payment data found'
        );
      }
      
      const initialPaymentDetails = data as unknown as PaymentDetails;
      
      // 1. Get blockchain data
      const { receivedAmount, lastTransactionTime } = await this.solanaClient.checkPayment(initialPaymentDetails);
      
      // Create a new object with the updated received amount
      const paymentDetails: PaymentDetails = {
        ...initialPaymentDetails,
        received_sol_amount: receivedAmount,
      };
      
      const expirationDate = paymentDetails.expiration_date ? new Date(paymentDetails.expiration_date) : new Date(0);
      const isExpired = new Date() > expirationDate;
      
      // Scenario A: Session is NOT expired
      if (!isExpired) {
        if (receivedAmount >= paymentDetails.sol_amount) {
          this.logger_.info(`Payment authorized (on time): ${paymentDetails.id}`);
          return {
            status: 'authorized',
            data: { ...paymentDetails, status: 'authorized', updated_at: new Date() },
          };
        }
        // Not enough paid yet, still pending
        return { status: 'pending', data: { ...paymentDetails, updated_at: new Date() } };
      }
      
      // Scenario B: Session IS expired
      this.logger_.info(`Payment session expired: ${paymentDetails.id}. Checking payment conditions...`);
      
      // Case B1: User paid on time, but check happens later than expiration time
      const paidOnTime = lastTransactionTime && lastTransactionTime <= expirationDate && receivedAmount >= paymentDetails.sol_amount;
      if (paidOnTime) {
        this.logger_.info(`Payment authorized (late confirmation, paid on time): ${paymentDetails.id}`);
        return {
          status: 'authorized',
          data: { ...paymentDetails, status: 'authorized', updated_at: new Date() },
        };
      }
      
      // Case B2: User paid late or underpaid. Renew the price and check against it.
      const newSolAmount = await this.solanaClient.convertToSol(paymentDetails.amount, paymentDetails.currency_code);
      
      if (receivedAmount >= newSolAmount) {
        this.logger_.info(`Payment authorized (paid late, but covered new price): ${paymentDetails.id}`);
        return {
          status: 'authorized',
          data: { ...paymentDetails, status: 'authorized', updated_at: new Date() },
        };
      }
      
      // If none of the above, renew the session with new price and expiration
      const renewedDetails = await this.renewPayment(paymentDetails);
      const finalDetails = {
        ...renewedDetails,
        received_sol_amount: receivedAmount, // carry over the received amount
      };
      
      this.logger_.info(`Payment session renewed with new price: ${finalDetails.sol_amount} SOL. Still pending.`);
      
      return {
        status: 'pending',
        data: finalDetails,
      };
      
    } catch (error) {
      this.logger_.error(`Error authorizing Solana payment: ${error}`);
      throw error;
    }
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    try {
      const { data } = input;
      
      if (!data) {
        throw new SolanaPaymentError(
          SolanaPaymentError.Types.INVALID_DATA,
          'No payment data found'
        );
      }
      
      const paymentDetails = data as unknown as PaymentDetails;
      
      // Mark payment as captured
      const updatedData = {
        ...paymentDetails,
        status: 'captured' as const,
        updated_at: new Date(),
      };
      
      this.logger_.info(`Payment captured: ${paymentDetails.id}`);
      
      // Transfer funds to cold storage wallet
      try {
        const txSignature = await this.solanaClient.transferToColdStorage(paymentDetails.id);
        this.logger_.info(`Funds transferred to cold storage: ${txSignature}`);
      } catch (error) {
        this.logger_.error(`Error transferring funds to cold storage: ${error}`);
        // Notify admin about the failure
        // this.notifyAdmin({
        //   type: 'cold_storage_transfer_failed',
        //   paymentId: paymentDetails.id,
        //   error: error instanceof Error ? error.message : 'Unknown error'
        // });
        // We still consider the payment captured even if the transfer fails
        // since the funds are in our one-time wallet
      }
      
      return {
        data: updatedData,
      };
    } catch (error) {
      this.logger_.error(`Error capturing Solana payment: ${error}`);
      throw error;
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    try {
      const { data } = input;
      
      if (!data) {
        throw new SolanaPaymentError(
          SolanaPaymentError.Types.INVALID_DATA,
          'No payment data found'
        );
      }
      
      const paymentDetails = data as unknown as PaymentDetails;
      
      // For Solana, we can only mark the payment as canceled
      // Actual refund would need to be handled separately if payment was already received
      
      this.logger_.info(`Payment canceled: ${paymentDetails.id}`);
      
      const updatedData = {
        ...paymentDetails,
        status: 'canceled' as const,
        updated_at: new Date(),
      };
      
      return {
        data: updatedData,
      };
    } catch (error) {
      this.logger_.error(`Error canceling Solana payment: ${error}`);
      throw error;
    }
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    try {
      const { data, amount } = input;
      
      if (!data) {
        throw new SolanaPaymentError(
          SolanaPaymentError.Types.INVALID_DATA,
          'No payment data found'
        );
      }
      
      const paymentDetails = data as unknown as PaymentDetails;
      
      // For Solana, refunds would need to be handled manually
      // Here we just mark the payment as refunded
      
      this.logger_.info(`Payment refund initiated: ${paymentDetails.id} for ${amount}`);
      
      const updatedData = {
        ...paymentDetails,
        status: 'refunded' as const,
        updated_at: new Date(),
      };
      
      return {
        data: updatedData,
      };
    } catch (error) {
      this.logger_.error(`Error refunding Solana payment: ${error}`);
      throw error;
    }
  }

  /**
 * Get the status of a payment
 * This function is mainely used by webhook based payment modules, but is required by medusa core. 
 * It is UNCLEAR what data structure it is called with when called by medusa. Beware!
 */
async getPaymentStatus(
  input: GetPaymentStatusInput
): Promise<GetPaymentStatusOutput> {
  try {
    const { data } = input;
    
    if (!data) {
      throw new SolanaPaymentError(
        SolanaPaymentError.Types.INVALID_DATA,
        'No payment data found'
      );
    }
    
    const paymentDetails = data as PaymentDetails;
    // If payment is already in a final state, return that state
    if (paymentDetails.status === 'captured') {
      return { status: 'captured' };
    } else if (paymentDetails.status === 'canceled') {
      return { status: 'canceled' };
    } else if (paymentDetails.status === 'requires_more') {
      return { status: 'requires_more' };
    }
    
    // Note: the payment is never "authorized" in Solana, it is either pending or captured
    
    // Payment not yet received
    return { 
      status: 'pending',
      data: paymentDetails
    };
  } catch (error) {
    this.logger_.error(`Error getting Solana payment status: ${error}`);
    throw error;
  }
}

  /**
   * Retrieve payment data
   */
  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    try {
      const { data } = input;
      
      if (!data) {
        throw new SolanaPaymentError(
          SolanaPaymentError.Types.INVALID_DATA,
          'No payment data found'
        );
      }
      
      // For Solana, we just return the stored payment data
      // In a more advanced implementation, we might fetch additional data from the blockchain
      
      return data;
    } catch (error) {
      this.logger_.error(`Error retrieving Solana payment: ${error}`);
      throw error;
    }
  }

  /**
   * Update payment data
   */
  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    try {
      const { data, amount, currency_code, context } = input;
      
      if (!data) {
        throw new SolanaPaymentError(
          SolanaPaymentError.Types.INVALID_DATA,
          'No payment data found'
        );
      }
      
      const paymentDetails = data as unknown as PaymentDetails;
      
      // Convert the new amount to SOL
      const solAmount = await this.solanaClient.convertToSol(Number(amount), currency_code);
      
      // Update payment details
      const updatedData = {
        ...paymentDetails,
        amount: Number(amount),
        currency_code,
        sol_amount: solAmount,
        updated_at: new Date(),
      };
      
      // Create a new description for the payment
      const customContext = context as CustomPaymentContext;
      const description = createPaymentDescription(
        customContext?.order_id || 'unknown',
        Number(amount),
        currency_code,
        solAmount
      );
      
      this.logger_.info(`Payment updated: ${paymentDetails.id} to ${solAmount} SOL`);
      
      // Return the updated data
      return {
        data: updatedData
      };
    } catch (error) {
      this.logger_.error(`Error updating Solana payment: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a payment session
   */
  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    try {
      const { data } = input;
      
      if (!data) {
        throw new SolanaPaymentError(
          SolanaPaymentError.Types.INVALID_DATA,
          'No payment data found'
        );
      }
      
      const paymentDetails = data as unknown as PaymentDetails;
      
      this.logger_.info(`Payment deleted: ${paymentDetails.id}`);
      
      // For Solana, we just mark the session as deleted
      // No actual deletion from the blockchain is possible
      
      return {};
    } catch (error) {
      this.logger_.error(`Error deleting Solana payment: ${error}`);
      throw error;
    }
  }

  /**
   * Process webhook events
   * This could be used to handle notifications from a service monitoring the blockchain
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload['payload']
  ): Promise<WebhookActionResult> {
    try {
      const { data } = payload;
      
      // This is a placeholder for handling webhook events
      // In a real implementation, you might receive notifications from a service
      // that monitors the blockchain for transactions to your wallet
      
      if (!data || !data.type) {
        return {
          action: 'not_supported',
        };
      }
      
      switch (data.type) {
        case 'payment_received':
          return {
            action: 'authorized',
            data: {
              session_id: String(data.session_id || ''),
              amount: Number(data.amount || 0),
            },
          };
        case 'payment_confirmed':
          return {
            action: 'captured',
            data: {
              session_id: String(data.session_id || ''),
              amount: Number(data.amount || 0),
            },
          };
        default:
          return {
            action: 'not_supported',
          };
      }
    } catch (error) {
      this.logger_.error(`Error processing Solana webhook: ${error}`);
      return {
        action: 'failed',
      };
    }
  }
}

export default SolanaPaymentProviderService;
