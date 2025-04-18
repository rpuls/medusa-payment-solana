import * as QRCode from "qrcode";

/**
 * Generate a unique payment ID
 */
export function generatePaymentId(): string {
  return `sol_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a QR code for a Solana payment
 * @param address Solana wallet address
 * @param amount Amount in SOL
 * @param description Optional payment description
 */
export async function generatePaymentQRCode(
  address: string,
  amount: number,
  description?: string
): Promise<string> {
  // Create a Solana payment URL
  // Format: solana:<address>?amount=<amount>&reference=<reference>&label=<label>&message=<message>
  const paymentUrl = `solana:${address}?amount=${amount}${
    description ? `&message=${encodeURIComponent(description)}` : ""
  }`;

  // Generate QR code as data URL
  try {
    return await QRCode.toDataURL(paymentUrl);
  } catch (error) {
    console.error("Error generating QR code:", error);
    return "";
  }
}

/**
 * Format a SOL amount with appropriate precision
 */
export function formatSolAmount(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 9,
  });
}

/**
 * Create a payment description for display to the customer
 */
export function createPaymentDescription(
  orderId: string,
  amount: number,
  currencyCode: string,
  solAmount: number
): string {
  return `Payment for order ${orderId}: ${amount} ${currencyCode} (${formatSolAmount(
    solAmount
  )} SOL)`;
}
