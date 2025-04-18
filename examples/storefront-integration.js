/**
 * Example of how to integrate the Solana payment provider in a React storefront
 * This is a simplified example and should be adapted to your specific storefront implementation
 */

import React, { useState, useEffect } from "react";
import { useCart } from "medusa-react";
import QRCode from "qrcode.react";

const SolanaPaymentComponent = ({ paymentSession }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const { cart } = useCart();

  // Extract payment details from the payment session
  const paymentData = paymentSession.data;
  const { sol_amount, wallet_address, description } = paymentData;

  // Create a Solana payment URL for the QR code
  useEffect(() => {
    if (wallet_address && sol_amount) {
      const paymentUrl = `solana:${wallet_address}?amount=${sol_amount}${
        description ? `&message=${encodeURIComponent(description)}` : ""
      }`;
      setQrCodeUrl(paymentUrl);
      setIsLoading(false);
    }
  }, [wallet_address, sol_amount, description]);

  // Poll for payment status
  useEffect(() => {
    if (paymentSession.id && paymentStatus === "pending") {
      const checkPaymentStatus = async () => {
        try {
          // This would be your API endpoint to check payment status
          const response = await fetch(`/api/payments/solana/status/${paymentSession.id}`);
          const data = await response.json();
          
          if (data.status !== "pending") {
            setPaymentStatus(data.status);
            
            // If payment is authorized or captured, refresh the cart
            if (data.status === "authorized" || data.status === "captured") {
              // Refresh cart or redirect to confirmation page
            }
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      };

      // Check status every 15 seconds
      const interval = setInterval(checkPaymentStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [paymentSession.id, paymentStatus]);

  if (isLoading) {
    return <div>Loading payment details...</div>;
  }

  return (
    <div className="solana-payment-container">
      <h3>Pay with Solana</h3>
      
      <div className="payment-details">
        <p>
          <strong>Amount:</strong> {sol_amount} SOL
        </p>
        <p>
          <strong>Send to wallet address:</strong>
        </p>
        <div className="wallet-address">
          <code>{wallet_address}</code>
          <button 
            onClick={() => navigator.clipboard.writeText(wallet_address)}
            className="copy-button"
          >
            Copy
          </button>
        </div>
      </div>

      {/* QR Code for payment */}
      <div className="qr-code-container">
        <p>Scan with a Solana wallet app:</p>
        <QRCode value={qrCodeUrl} size={200} />
      </div>

      <div className="payment-status">
        <p>
          <strong>Status:</strong>{" "}
          {paymentStatus === "pending" ? (
            <span className="status pending">Waiting for payment...</span>
          ) : paymentStatus === "authorized" ? (
            <span className="status authorized">Payment received!</span>
          ) : paymentStatus === "captured" ? (
            <span className="status captured">Payment confirmed!</span>
          ) : (
            <span className="status error">Payment failed</span>
          )}
        </p>
      </div>

      <div className="payment-instructions">
        <h4>Instructions:</h4>
        <ol>
          <li>Open your Solana wallet app</li>
          <li>Send exactly {sol_amount} SOL to the address above</li>
          <li>Wait for the transaction to be confirmed</li>
          <li>The page will automatically update when payment is received</li>
        </ol>
      </div>
    </div>
  );
};

export default SolanaPaymentComponent;
