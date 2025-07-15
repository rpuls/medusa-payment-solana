# Medusa Solana Payment Provider

A payment provider for Medusa.js 2.0 that accepts Solana cryptocurrency payments, with built-in protection against price volatility through payment session expiration, and real-time currency conversion via external API.

OBS: This is a beta version!

## Features

- Accept Solana (SOL) cryptocurrency payments in your Medusa store.
- Convert cart totals from fiat to SOL using fixed rates or a CoinGecko integration.
- Payment session expiration to lock in prices for a configurable duration.
- Handles partial payments and price updates gracefully.
- Monitors the blockchain for payment confirmation via a scheduled job.
- Support for payment authorization and capture workflows, including automated fund transfer to a cold storage wallet.

## Prerequisites

- Medusa.js 2.0 project (find our recommended template here: [MedusaJS 2.0 Template](https://funkyton.com/medusajs-2-0-is-finally-here/))
- Node.js 22 or higher
- A Solana wallet address for cold storage and a mnemonic phrase for deriving payment addresses.

## Installation

1.  **Install the Package**:
    ```bash
    npm install medusa-payment-solana
    ```

## Configuration

1.  **Update `medusa-config.js`**:

##### Example
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


##### The available options are:

| Option                     | Type     | Description                                                                                             | Required |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | -------- |
| `passPhrase`               | `string` | Your 12 or 24-word BIP39 mnemonic phrase. Used to generate unique, one-time payment addresses.           | **Yes**  |
| `coldStorageWallet`        | `string` | The public key of the wallet where funds will be transferred after a payment is captured.                | **Yes**  |
| `rpcUrl`                   | `string` | Use; Devenet: https://api.devnet.solana.com or Mainnet: https://api.mainnet-beta.solana.com See: https://solana.com/docs/references/clusters for more info.            | **Yes**       |
| `sessionExpirationSeconds` | `number` | The time in seconds a payment session is valid before the price is renewed. Defaults to `300` (5 minutes). | No       |
| `currencyConverter`        | `object` | Configuration for currency conversion. See [Currency Conversion](#currency-conversion).                   | No       |


2.  **Update `.env`**:
    Add the following environment variables to your Medusa backend's `.env` file:
    ```
    SOLANA_MNEMONIC="your 12 or 24-word mnemonic phrase"
    SOLANA_COLD_STORAGE_WALLET="your solana cold storage wallet address"
    # Add this if you are using the CoinGecko currency converter
    COINGECKO_API_KEY="your coingecko api key"
    ```
    You can generate a new mnemonic phrase by running the `node scripts/generatePassPhrase.js` script from the `medusa-payment-solana` module's directory. **Do not share your mnemonic phrase with anyone.**

## Scheduled Job Setup

To automatically monitor and process payments, you must set up a scheduled job. Create a file `backend/src/jobs/check-payments.ts` with the following content:

```typescript
import { checkPaymentsJob } from 'medusa-payment-solana';

// Export the job function
export default checkPaymentsJob;

// Configure the job schedule (Recommended, every minute)
export const config = {
  name: "check-solana-payments",
  schedule: "*/1 * * * *",
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
// OBS: Many wallets no longer support QR code with parameters. Alternatively, render QR code from: solana_one_time_address 

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

## Disclaimer

This Solana payment module is (or will be) provided as free, open-source software, with no warranties, guarantees, or liability of any kind. Use it at your own risk.
I/we do not charge for this module, nor do I/we offer insurance, customer support, or any guarantees against software bugs, user mistakes, or lost funds.
Always test thoroughly on testnet before using it with real funds, and make sure you understand how blockchain payments work.

It is your responsibility to ensure that your use of this software complies with all applicable laws and regulations in your country or jurisdiction, including but not limited to anti-money laundering (AML) and cryptocurrency regulations. I/we are not liable for any legal issues, penalties, or consequences resulting from the use or misuse of this software.

By using this module, you accept full responsibility for any transactions, losses, errors, or legal issues that may occur.

## License

MIT

<p align="center">
  <a href="https://funkyton.com/">
    <div style="text-align: center;">
      <picture>
        <img alt="FUNKYTON logo" src="https://res-5.cloudinary.com/hczpmiapo/image/upload/q_auto/v1/ghost-blog-images/funkyton-logo.png" width=200>
      </picture>
    </div>
  </a>
</p>
