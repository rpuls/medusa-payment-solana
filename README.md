# Medusa Solana Payment Provider

A payment provider for Medusa.js 2.0 that accepts Solana cryptocurrency payments.

## Features

- Accept Solana (SOL) cryptocurrency payments in your Medusa store
- Convert cart totals from USD/EUR to SOL
- Display wallet address for payment
- Monitor the blockchain for payment confirmation
- Support for payment authorization, capture, and refund workflows

## Prerequisites

- Medusa.js 2.0 or higher
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
SOLANA_MNEMONIC=
```

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

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## How It Works

1. **Initiate Payment**: When a customer selects Solana as their payment method, the provider converts the cart total to SOL and generates a unique payment ID.

2. **Display Payment Details**: The storefront displays the Solana wallet address and the amount in SOL to be paid.

3. **Monitor for Payment**: The provider periodically checks the blockchain for incoming transactions to the specified wallet address.

4. **Authorize Payment**: Once a matching payment is detected, the payment is authorized.

5. **Capture Payment**: The payment is captured, and the order is processed.

## Customization

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

The provider includes functionality to generate QR codes for payments, but this is not enabled by default. To enable QR codes in your storefront, you can use the `generatePaymentQRCode` function from the `utils.ts` file.

## License

MIT
