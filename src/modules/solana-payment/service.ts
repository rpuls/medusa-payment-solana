import { AbstractPaymentProvider } from '@medusajs/framework/utils';
import { PublicKey } from '@solana/web3.js';
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
  PaymentSessionStatus,
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
  converter?: {
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
      rpcUrl: this.options_.rpcUrl || 'https://api.testnet.solana.com',
      mnemonic: this.options_.passPhrase,
      currencyConverter: {
        provider: this.options_.converter?.provider || 'default',
        apiKey: this.options_.converter?.apiKey
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
      
      // Generate a unique payment ID
      const paymentId = generatePaymentId();
      
      // Convert the amount to SOL
      const solAmount = await this.solanaClient.convertToSol(Number(amount), currency_code);
      this.logger_.info(`Converted ${amount} ${currency_code} to ${solAmount} SOL`);
      
  
      const solana_one_time_address = this.solanaClient.generateAddress(paymentId);
      
      // Create payment details
      const paymentDetails: PaymentDetails = {
        id: paymentId,
        amount: Number(amount),
        currency_code,
        sol_amount: solAmount,
        solana_one_time_address,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
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
      
      const paymentDetails = data as unknown as PaymentDetails;
      
      // Check if payment has been received
      const isPaymentReceived = await this.solanaClient.checkPayment(paymentDetails);
      
      if (isPaymentReceived) {
        this.logger_.info(`Payment authorized: ${paymentDetails.id}`);
        
        // Update payment status
        const updatedData = {
          ...paymentDetails,
          status: 'authorized' as const,
          updated_at: new Date(),
        };
        
        return {
          status: 'authorized',
          data: updatedData,
        };
      }
      
      // Payment not received yet
      return {
        status: 'pending',
        data: {
          ...paymentDetails,
          updated_at: new Date(),
        },
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
      
      // For Solana payments, capture is essentially just marking the payment as captured
      // since the funds are already in our wallet once authorized
      
      this.logger_.info(`Payment captured: ${paymentDetails.id}`);
      
      const updatedData = {
        ...paymentDetails,
        status: 'captured' as const,
        updated_at: new Date(),
      };
      
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
    
    // Check if payment has been received
    const isPaymentReceived = await this.solanaClient.checkPayment(paymentDetails);
    
    // Note: the payment is essentially captured already, but the medusa payment flow requires authorization before capturing.
    if (isPaymentReceived) {
      return { 
        status: 'authorized',
        data: { 
          ...paymentDetails,
          verified_at: new Date().toISOString() 
        }
      };
    }
    
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
