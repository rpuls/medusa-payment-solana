import SolanaPaymentProviderService from "../src/modules/solana-payment/service";
import SolanaClient from "../src/modules/solana-payment/solana-client";
import { generatePaymentId } from "../src/modules/solana-payment/utils";

// Mock the SolanaClient
jest.mock("../src/modules/solana-payment/solana-client");

describe("SolanaPaymentProviderService", () => {
  let solanaPaymentProvider;
  let mockLogger;
  
  beforeEach(() => {
    // Mock the logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    
    // Mock the SolanaClient implementation
    SolanaClient.mockImplementation(() => ({
      convertToSol: jest.fn().mockImplementation((amount, currency) => {
        return currency === "USD" ? amount * 0.05 : amount * 0.055;
      }),
      getWalletAddress: jest.fn().mockReturnValue("testWalletAddress"),
      checkPayment: jest.fn().mockResolvedValue(false),
    }));
    
    // Create the payment provider instance
    solanaPaymentProvider = new SolanaPaymentProviderService(
      { logger: mockLogger },
      {
        walletAddress: "testWalletAddress",
        rpcUrl: "https://api.testnet.solana.com",
      }
    );
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe("initiatePayment", () => {
    it("should initialize a payment session with correct data", async () => {
      // Mock the generatePaymentId function
      jest.spyOn(require("../src/modules/solana-payment/utils"), "generatePaymentId")
        .mockReturnValue("test_payment_id");
      
      const input = {
        amount: 100,
        currency_code: "USD",
        context: {
          order_id: "test_order_123",
        },
      };
      
      const result = await solanaPaymentProvider.initiatePayment(input);
      
      expect(result).toHaveProperty("id", "test_payment_id");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("sol_amount", 5); // 100 USD * 0.05 = 5 SOL
      expect(result.data).toHaveProperty("wallet_address", "testWalletAddress");
      expect(result.data).toHaveProperty("status", "pending");
      expect(result.data).toHaveProperty("description");
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
  
  describe("authorizePayment", () => {
    it("should return pending status when payment is not received", async () => {
      const paymentDetails = {
        id: "test_payment_id",
        amount: 100,
        currency_code: "USD",
        sol_amount: 5,
        wallet_address: "testWalletAddress",
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const input = {
        data: paymentDetails,
      };
      
      const result = await solanaPaymentProvider.authorizePayment(input);
      
      expect(result).toHaveProperty("status", "pending");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("status", "pending");
    });
    
    it("should return authorized status when payment is received", async () => {
      // Mock the checkPayment method to return true
      SolanaClient.mockImplementation(() => ({
        convertToSol: jest.fn().mockImplementation((amount, currency) => {
          return currency === "USD" ? amount * 0.05 : amount * 0.055;
        }),
        getWalletAddress: jest.fn().mockReturnValue("testWalletAddress"),
        checkPayment: jest.fn().mockResolvedValue(true),
      }));
      
      // Recreate the payment provider with the new mock
      solanaPaymentProvider = new SolanaPaymentProviderService(
        { logger: mockLogger },
        {
          walletAddress: "testWalletAddress",
          rpcUrl: "https://api.testnet.solana.com",
        }
      );
      
      const paymentDetails = {
        id: "test_payment_id",
        amount: 100,
        currency_code: "USD",
        sol_amount: 5,
        wallet_address: "testWalletAddress",
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const input = {
        data: paymentDetails,
      };
      
      const result = await solanaPaymentProvider.authorizePayment(input);
      
      expect(result).toHaveProperty("status", "authorized");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("status", "authorized");
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
  
  describe("capturePayment", () => {
    it("should mark payment as captured", async () => {
      const paymentDetails = {
        id: "test_payment_id",
        amount: 100,
        currency_code: "USD",
        sol_amount: 5,
        wallet_address: "testWalletAddress",
        status: "authorized",
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const input = {
        data: paymentDetails,
      };
      
      const result = await solanaPaymentProvider.capturePayment(input);
      
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("status", "captured");
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
  
  describe("cancelPayment", () => {
    it("should mark payment as canceled", async () => {
      const paymentDetails = {
        id: "test_payment_id",
        amount: 100,
        currency_code: "USD",
        sol_amount: 5,
        wallet_address: "testWalletAddress",
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const input = {
        data: paymentDetails,
      };
      
      const result = await solanaPaymentProvider.cancelPayment(input);
      
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("status", "canceled");
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
  
  describe("getPaymentStatus", () => {
    it("should return the correct payment status", async () => {
      const paymentDetails = {
        id: "test_payment_id",
        amount: 100,
        currency_code: "USD",
        sol_amount: 5,
        wallet_address: "testWalletAddress",
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const input = {
        data: paymentDetails,
      };
      
      const result = await solanaPaymentProvider.getPaymentStatus(input);
      
      expect(result).toHaveProperty("status", "pending");
    });
  });
});
