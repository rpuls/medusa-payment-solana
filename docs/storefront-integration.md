# Integrating Solana Payments in Your Medusa Storefront

This guide explains how to integrate the Solana payment provider into your Medusa.js storefront.

## Prerequisites

- A Medusa.js storefront (Next.js, React, etc.)
- The Solana payment provider installed and configured in your Medusa backend
- Solana enabled as a payment provider in your region settings

## Integration Steps

### 1. Add Solana Payment Component

Create a component to handle Solana payments in your storefront. You can use the example in `examples/storefront-integration.js` as a starting point.

### 2. Add Payment Status API Endpoint

Create an API endpoint to check the payment status. You can use the example in `examples/api-endpoint.js` as a starting point.

### 3. Integrate with Checkout Flow

Modify your checkout flow to include the Solana payment option. Here's a simplified example:

```jsx
import { useCheckout } from "path-to-your-checkout-context";
import SolanaPaymentComponent from "./SolanaPaymentComponent";

const CheckoutPayment = () => {
  const { 
    cart,
    paymentSession, 
    setPaymentSession, 
    availablePaymentSessions 
  } = useCheckout();

  // Find the Solana payment provider
  const solanaPaymentProvider = availablePaymentSessions.find(
    (provider) => provider.provider_id === "solana"
  );

  const handlePaymentSelection = async (providerId) => {
    // Set the selected payment provider
    await setPaymentSession(providerId);
  };

  return (
    <div>
      <h2>Payment Method</h2>
      
      {/* Payment provider selection */}
      <div className="payment-providers">
        {availablePaymentSessions.map((provider) => (
          <button
            key={provider.provider_id}
            onClick={() => handlePaymentSelection(provider.provider_id)}
            className={
              paymentSession?.provider_id === provider.provider_id
                ? "selected"
                : ""
            }
          >
            {provider.provider_id === "solana" ? "Pay with Solana" : provider.provider_id}
          </button>
        ))}
      </div>
      
      {/* Show Solana payment component if selected */}
      {paymentSession?.provider_id === "solana" && (
        <SolanaPaymentComponent paymentSession={paymentSession} />
      )}
    </div>
  );
};

export default CheckoutPayment;
```

### 4. Style the Payment Component

Add CSS styles to make the Solana payment component match your storefront design. Here's a basic example:

```css
.solana-payment-container {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.wallet-address {
  display: flex;
  align-items: center;
  background-color: #f7fafc;
  padding: 0.5rem;
  border-radius: 0.25rem;
  margin: 0.5rem 0;
  word-break: break-all;
}

.copy-button {
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: #4a5568;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.qr-code-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem 0;
}

.payment-status {
  margin: 1rem 0;
}

.status {
  font-weight: bold;
}

.status.pending {
  color: #d69e2e;
}

.status.authorized {
  color: #38a169;
}

.status.captured {
  color: #38a169;
}

.status.error {
  color: #e53e3e;
}

.payment-instructions {
  background-color: #f7fafc;
  padding: 1rem;
  border-radius: 0.25rem;
  margin-top: 1rem;
}
```

### 5. Handle Payment Completion

When a payment is authorized or captured, you should update the UI to reflect this and proceed with the order completion. This typically involves:

1. Redirecting to an order confirmation page
2. Showing a success message
3. Clearing the cart

## Testing

To test the Solana payment integration:

1. Make sure the Solana payment provider is enabled in your Medusa backend
2. Go through the checkout process in your storefront
3. Select "Solana" as the payment method
4. Use the provided wallet address to send a test payment
   - For development, you can use the simulation script: `npm run simulate-payment`

## Troubleshooting

If you encounter issues with the Solana payment integration:

1. Check the browser console for errors
2. Verify that the Solana payment provider is properly configured in your Medusa backend
3. Ensure that the wallet address is correctly displayed in the payment component
4. Check the Medusa server logs for any errors related to payment processing

## Production Considerations

Before deploying to production:

1. Update the conversion rates to use real-time data from an API
2. Implement proper error handling and user feedback
3. Add loading states for better UX during payment processing
4. Consider adding a timeout mechanism for payments that take too long
5. Implement proper security measures to prevent payment fraud
