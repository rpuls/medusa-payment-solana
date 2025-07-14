import SolanaPaymentService from '../src/modules/solana-payment/service';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger } from "@medusajs/types";
import { PaymentSessionStatus } from "@medusajs/utils";
import SolanaClient from '../src/modules/solana-payment/solana-client';

// Mock the SolanaClient
jest.mock("../src/modules/solana-payment/solana-client", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      getWalletAddress: jest.fn().mockReturnValue("2ZY3T9qbJuTyqdtLKhEZ5e6QYFm77mESyFVK1pgx99uk"),
      checkPayment: jest.fn().mockResolvedValue({ paid: false, totalAmount: 0 }),
      transferLamports: jest.fn().mockResolvedValue("some_signature"),
    })),
  };
});

// Mock the CurrencyConverter
jest.mock("../src/modules/solana-payment/currency-converter", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    convertToSol: jest.fn().mockResolvedValue(0.5), // 100 USD = 0.5 SOL
  })),
}));

describe('SolanaPaymentService', () => {
  let solanaService: SolanaPaymentService;
  let logger: MockProxy<Logger>;
  let solanaClient: MockProxy<SolanaClient>;

  beforeEach(() => {
    logger = mock<Logger>();
    solanaClient = mock<SolanaClient>();
    
    const container = {
      logger: logger,
    };

    const options = {
      passPhrase: 'your twelve word pass phrase here for testing purposes only do not use in production',
      coldStorageWallet: '2ZY3T9qbJuTyqdtLKhEZ5e6QYFm77mESyFVK1pgx99uk',
      rpcUrl: 'https://api.devnet.solana.com',
      sessionExpirationSeconds: 300,
    };

    jest.spyOn(SolanaPaymentService.prototype, 'initialize').mockImplementation(async () => {});
    solanaService = new SolanaPaymentService(container, options);
    solanaService['solanaClient'] = solanaClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a payment session', async () => {
    const context = {
      currency_code: 'usd',
      amount: 10000, // $100.00
      resource_id: 'cart_123',
      context: {},
    };

    (solanaClient.convertToSol as jest.Mock).mockResolvedValue(0.5);
    (solanaClient.generateAddress as jest.Mock).mockReturnValue('some_address');

    const session = await solanaService.initiatePayment(context);

    expect(session).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        data: expect.objectContaining({
          sol_amount: expect.any(Number),
          received_sol_amount: 0,
          solana_one_time_address: expect.any(String),
          expiration_date: expect.any(Object),
          status: 'pending',
        }),
      })
    );
  });

  it('should authorize a payment', async () => {
    const paymentSession = {
      id: 'test_session_id',
      data: {
        solana_one_time_address: 'some_address',
        sol_amount: 0.5,
        expiration_date: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
      },
      status: PaymentSessionStatus.PENDING,
    };
    const context = {};

    // Mock checkPayment to return that the payment was made
    (solanaService['solanaClient'].checkPayment as jest.Mock).mockResolvedValue({
      receivedAmount: 0.5,
      lastTransactionTime: new Date(),
    });

    const result = await solanaService.authorizePayment(paymentSession);

    expect(result).toEqual({
      status: PaymentSessionStatus.AUTHORIZED,
      data: expect.any(Object),
    });
  });

  it('should capture a payment and transfer funds', async () => {
    const paymentSession = {
      id: 'test_session_id',
      data: {
        solana_one_time_address: 'some_address',
        sol_amount: 0.5,
        status: 'authorized',
      },
      status: PaymentSessionStatus.AUTHORIZED,
    };

    (solanaClient.transferToColdStorage as jest.Mock).mockResolvedValue('some_signature');

    const result = await solanaService.capturePayment({ data: paymentSession.data });

    expect(result.data).toEqual(
      expect.objectContaining({
        status: 'captured',
      })
    );
  });

  it('should cancel a payment', async () => {
    const paymentSession = {
      id: 'test_session_id',
      data: {},
      status: PaymentSessionStatus.PENDING,
    };

    const result = await solanaService.cancelPayment({ data: paymentSession.data });

    expect(result.data).toEqual(
      expect.objectContaining({
        status: 'canceled',
      })
    );
  });
});
