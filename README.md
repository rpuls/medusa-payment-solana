# Medusa Solana Payment Provider

A payment provider for Medusa.js 2.0 that accepts Solana cryptocurrency payments, with built-in protection against price volatility through payment session expiration, and real-time currency conversion via external API.

## Features

- Accept Solana (SOL) cryptocurrency payments in your Medusa store.
- Convert cart totals from fiat to SOL using fixed rates or a CoinGecko integration.
- Payment session expiration to lock in prices for a configurable duration.
- Handles partial payments and price updates gracefully.
- Monitors the blockchain for payment confirmation via a scheduled job.
- Support for payment authorization and capture workflows, including automated fund transfer to a cold storage wallet.

## Prerequisites

- Medusa.js 2.0 project (find our recommended template here: [MedusaJS 2.0 Template](https://funkyton.com/medusajs-2-0-is-finally-here/))
- Node.js 16 or higher
- A Solana wallet address for cold storage and a mnemonic phrase for deriving payment addresses.

## Installation

```bash
npm install medusa-payment-solana
```

## Configuration

Add the module to your `medusa-config.js`. The available options are:

| Option                     | Type     | Description                                                                                             | Required |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | -------- |
| `passPhrase`               | `string` | Your 12 or 24-word BIP39 mnemonic phrase. Used to generate unique, one-time payment addresses.           | **Yes**  |
| `coldStorageWallet`        | `string` | The public key of the wallet where funds will be transferred after a payment is captured.                 | **Yes**  |
| `rpcUrl`                   | `string` | The URL of the Solana RPC endpoint. Defaults to Solana's public testnet. Use a mainnet RPC for production. | No       |
| `sessionExpirationSeconds` | `number` | The time in seconds a payment session is valid before the price is renewed. Defaults to `300` (5 minutes). | No       |
| `currencyConverter`        | `object` | Configuration for currency conversion. See [Currency Conversion](#currency-conversion).                   | No       |

**Example `medusa-config.js`:**

```javascript
module.exports = defineConfig({
  // ...
  modules: [
    // ...
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "medusa-payment-solana",
            id: "solana",
            options: {
              passPhrase: process.env.SOLANA_MNEMONIC,
              coldStorageWallet: process.env.SOLANA_COLD_STORAGE_WALLET,
              rpcUrl: "https://api.testnet.solana.com", // Use mainnet for production
              sessionExpirationSeconds: 600, // 10 minutes
              currencyConverter: {
                provider: "coingecko",
                apiKey: process.env.COINGECKO_API_KEY,
              }
            }
          }
        ]
      }
    }
  ]
});
```

Make sure to set the `SOLANA_MNEMONIC` environment variable in your `.env` file:

```
SOLANA_MNEMONIC="word word word word word word word word word word word word"
```
If you don't know what a mnemonic prhase is, or how to generate one you can use script `node scripts/generatePassPhrase.js` to get one. (DONT SHARE WITH ANYONE)

## Scheduled Job Setup

To automatically monitor and process payments, you must set up a scheduled job. Create a file `backend/src/jobs/check-payments.ts` with the following content:

```typescript
import { checkPaymentsJob } from 'medusa-payment-solana';

// Export the job function
export default checkPaymentsJob;

// Configure the job schedule (e.g., every 5 minutes)
export const config = {
  name: "check-solana-payments",
  schedule: "*/5 * * * *",
};
```

This job ensures orders are processed even if the shopper leaves the website after payment.


## Currency Conversion

The module supports two currency conversion options, configured via the `currencyConverter` object.

1.  **`default`** - Uses fixed exchange rates:
    *   1 USD = 0.0075 SOL
    *   1 EUR = 0.008 SOL

2.  **`coingecko`** - Uses real-time rates from the CoinGecko API.

#### Configuration Example

To use the CoinGecko provider, update your Medusa config and set the `COINGECKO_API_KEY` in your backend `.env` file.

```javascript
// In medusa-config.js, within the provider options:
currencyConverter: {
  provider: "coingecko",
  apiKey: process.env.COINGECKO_API_KEY
}
```

## Enable in Medusa Admin

1.  Go to Settings > Regions.
2.  Select the region where you want to enable Solana payments.
3.  In the "Payment Providers" section, check the box next to "solana".
4.  Save the changes.

## How It Works

### Payment Flow and Expiration

The module is designed to protect merchants from cryptocurrency price volatility.

1.  **Initiation**: When a customer selects Solana, a payment session is created with a calculated SOL amount and an **expiration date** (e.g., 5 minutes in the future).
2.  **Monitoring**: A scheduled job periodically checks for payments.
3.  **Verification**:
    *   **If the session is active** and the full amount is received, the payment is authorized.
    *   **If the session has expired**, the system checks if the payment was made *before* the expiration time. If so, it's authorized.
    *   **If the payment is late or partial**, the system recalculates the price. If the received amount covers the new price, it's authorized. Otherwise, the session is updated with the new price and a new expiration time, allowing the customer to pay the remaining balance.
4.  **Capture & Transfer**: Once authorized, the payment is captured, the order is placed, and the funds are automatically transferred to your cold storage wallet.

This ensures fairness: the customer has a reasonable window to pay the quoted price, and the merchant is protected if the payment is late and the market has moved.

## Storefront Integration

Here is a framework-agnostic guide to integrating the Solana payment module into your storefront.

### 1. Retrieve Payment Session Data

Your checkout page should periodically poll your Medusa backend to get the latest payment session information. The correct way to do this with the storefront SDK is to retrieve the `cart` by its ID and then find the Solana payment session within its `payment_collection`.

```javascript
// Example: Based on the Medusa Storefront SDK
// This function polls for the latest cart information.
async function checkPaymentStatus(cartId, currentPaymentSessionId) {
  // Use the SDK to retrieve the cart
  const { cart: updatedCart } = await sdk.store.cart.retrieve(cartId);
  
  // Find the Solana payment session in the cart
  const solanaSession = updatedCart?.payment_collection?.payment_sessions?.find(
    (session) => session.id === currentPaymentSessionId
  );

  return solanaSession;
}
```

### 2. Payment Session Data Structure

The `data` object within the Solana payment session will look like this:

```json
{
  "id": "sol_175149...",
  "amount": 20,
  "currency_code": "eur",
  "status": "pending",
  "created_at": "2025-07-02T22:06:36.654Z",
  "updated_at": "2025-07-02T22:12:02.578Z",
  "sol_amount": 0.153527289,
  "received_sol_amount": 0.1,
  "expiration_date": "2025-07-02T22:17:02.578Z",
  "solana_one_time_address": "GCfKDFEv49rGvfVHSCT2fLLsvg27UYarbaZLFyaHWUBC"
}
```

### 3. Display Logic & QR Code Example

Use the payment session data to build your UI.

```javascript
// --- Pseudo-code for UI logic ---

// Extract data from the session
const { 
  sol_amount, 
  received_sol_amount, 
  solana_one_time_address,
  expiration_date 
} = solanaPaymentSession.data;

// 1. Calculate the remaining amount
const remainingAmount = Math.max(0, sol_amount - received_sol_amount);

// 2. Create the payment URL for the QR code
//    The URL should only request the *remaining* amount.
const paymentUrl = `solana:${solana_one_time_address}?amount=${remainingAmount.toFixed(9)}`;

// 3. Render the UI
//    - Display total price (sol_amount), amount paid (received_sol_amount), and remaining amount.
//    - Show a countdown timer based on expiration_date.
//    - Generate a QR code from paymentUrl.
//    - If the session is expired, show a message explaining that the system is verifying the payment.
```

### 4. Finalize the Order

When your polling detects that the payment session `status` is `authorized` or `captured`, the order has been successfully processed by the backend.

At this point, you should complete the cart, which turns it into a finalized order. The example storefront uses a helper function for this, which is a good practice.

```javascript
// Example:
if (solanaPaymentSession.status === 'authorized' || solanaPaymentSession.status === 'captured') {
  // The `placeOrder` function is a helper that likely calls the
  // Medusa SDK to complete the cart and then handles redirecting
  // the user to the order confirmation page.
  await placeOrder(); 
}
```

## License

MIT
