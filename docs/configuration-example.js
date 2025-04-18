/**
 * Example configuration for the Solana payment provider in medusa-config.js or medusa-config.ts
 */

// For JavaScript (medusa-config.js)
module.exports = {
  projectConfig: {
    // ... other project config
  },
  plugins: [
    // ... other plugins
  ],
  modules: [
    // ... other modules
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          // ... other payment providers
          {
            resolve: "medusa-payment-solana",
            id: "solana",
            options: {
              // Required: Your Solana wallet address to receive payments
              walletAddress: process.env.SOLANA_ADDRESS,
              
              // Optional: Solana RPC URL (defaults to testnet)
              rpcUrl: process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com",
              
              // Optional: Path to wallet keypair file (for testing only)
              walletKeypairPath: process.env.NODE_ENV === "development" ? 
                "wallet-keypair.json" : undefined,
              
              // Optional: Payment polling interval in milliseconds (defaults to 30000)
              paymentPollingInterval: 30000,
            }
          }
        ]
      }
    }
  ]
};

// For TypeScript (medusa-config.ts)
/*
import { defineConfig } from "@medusajs/medusa-config"

export default defineConfig({
  projectConfig: {
    // ... other project config
  },
  plugins: [
    // ... other plugins
  ],
  modules: [
    // ... other modules
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          // ... other payment providers
          {
            resolve: "medusa-payment-solana",
            id: "solana",
            options: {
              // Required: Your Solana wallet address to receive payments
              walletAddress: process.env.SOLANA_ADDRESS,
              
              // Optional: Solana RPC URL (defaults to testnet)
              rpcUrl: process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com",
              
              // Optional: Path to wallet keypair file (for testing only)
              walletKeypairPath: process.env.NODE_ENV === "development" ? 
                "wallet-keypair.json" : undefined,
              
              // Optional: Payment polling interval in milliseconds (defaults to 30000)
              paymentPollingInterval: 30000,
            }
          }
        ]
      }
    }
  ]
})
*/

/**
 * Environment variables (.env file)
 * 
 * SOLANA_ADDRESS=your_solana_wallet_address
 * SOLANA_RPC_URL=https://api.testnet.solana.com  # Optional, defaults to testnet
 */
