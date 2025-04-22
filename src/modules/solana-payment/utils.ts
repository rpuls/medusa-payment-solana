/**
 * Generate a unique payment ID
 */
export function generatePaymentId(): string {
  return `sol_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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
