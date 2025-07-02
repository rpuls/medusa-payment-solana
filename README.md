# Medusa Solana Payment Provider

A payment provider for Medusa.js 2.0 that accepts Solana cryptocurrency payments.

## Features

- Accept Solana (SOL) cryptocurrency payments in your Medusa store
- Convert cart totals from USD/EUR to SOL
- Display wallet address for payment
- Monitor the blockchain for payment confirmation
- Support for payment authorization and capture workflows

## Prerequisites

- Medusa.js 2.0 project (find our recommended template here: [MedusaJS 2.0 Template](https://funkyton.com/medusajs-2-0-is-finally-here/))
- Node.js 16 or higher
- A Solana wallet address

## Installation

```bash
npm install medusa-payment-solana
```

## Configuration

Add the following to your `medusa-config.js` or `medusa-config.ts`:

```typescript
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
              rpcUrl: "https://api.testnet.solana.com", // Use mainnet for production
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

### Scheduled Job Setup

To monitor payments, create a file `src/jobs/check-payments.ts` with the following content:

```typescript
import { checkPaymentsJob } from 'medusa-payment-solana'

// Export the job function
export default checkPaymentsJob

// Configure the job schedule
export const config = {
  name: "check-solana-payments",
  schedule: "*/5 * * * *", // Runs every 5 minutes
}
```

This scheduled job will:
1. Check for pending Solana payments
2. Verify transactions on the Solana blockchain
3. Automatically authorize and capture successful payments
4. Place orders for completed payments
5. Transfer funds to the cold storage wallet

The job runs independently of the storefront, ensuring orders are processed even if:
- The shopper leaves the website after payment
- The browser session ends
- The storefront experiences technical issues

When a payment is successfully captured:
- The order is automatically placed in Medusa
- The shopper receives an order confirmation email (if configured)
- Funds are transferred to the cold storage wallet

## Usage

### In the Medusa Admin

1. Go to Settings > Regions
2. Edit a region or create a new one
3. In the Payment Providers section, enable "Solana"
4. Save the region

### In the Storefront

When a customer reaches the checkout page, they will be able to select "Solana" as a payment method. The checkout will display:

1. The total amount in SOL
2. The wallet address to send the payment to
3. Instructions for completing the payment


## How It Works

1. **Initiate Payment**: When a customer selects Solana as their payment method, the provider converts the cart total to SOL and generates a unique payment ID.

2. **Display Payment Details**: The storefront displays the Solana wallet address and the amount in SOL to be paid.

3. **Monitor for Payment**: This must be done using a scheduled job. Configure the `import { checkPaymentsJob } from 'medusa-payment-solana'` to periodically check the blockchain for incoming transactions to the specified wallet address.

4. **Authorize Payment**: Once a matching payment is detected, the payment is authorized.

5. **Capture Payment**: The payment is captured immediately when the payment is authorized. The funds are then transferred to the cold storage wallet.

6. **Cold Storage Transfer**: After capture, the funds are transferred from the one-time wallet to the configured cold storage wallet. The one-time wallet is emptied and will be closed automatically by the Solana network when its balance reaches zero.

### Error Handling
- If the cold storage transfer fails, the payment is still marked as captured since the funds are safely in the one-time wallet
- Transfer failures are logged and can be monitored for manual intervention
- The system ensures customers receive their orders even if internal transfers encounter issues


### Currency Conversion

The payment provider supports two currency conversion options:

1. **Default Converter** - Uses fixed exchange rates:
   - 1 USD = 0.0075 SOL
   - 1 EUR = 0.008 SOL

2. **CoinGecko Converter** - Uses real-time rates from CoinGecko API

#### Configuration

To configure the currency converter, update your Medusa config:

```javascript
{
  resolve: "medusa-payment-solana",
  options: {
    walletAddress: process.env.SOLANA_MNEMONIC,
    currencyConverter: {
      provider: "coingecko", // or "default"
      apiKey: process.env.COINGECK_API_KEY // Required for coingecko
    }
  }
}
```

#### CoinGecko Requirements

When using the CoinGecko provider:
1. Set the COINGECK_API_KEY in your .env file
2. Ensure your API key has sufficient permissions for the CoinGecko API

#### Best Practices

- Cache exchange rates to reduce API calls
- Implement error handling for API failures
- Monitor API usage to avoid rate limits

### QR Code Generation

Here's a simple example of generating a QR code from paymentSession data, in a React Storefront:

```typescript
import QRCode from "react-qr-code";

const paymentUrl = `solana:${paymentSession.data.solana_one_time_address}?amount=${paymentSession.data.sol_amount}`;

return (
  <QRCode value={paymentUrl} />
);
```

This will generate a QR code that wallets can scan to pre-fill the payment details.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## License

MIT
