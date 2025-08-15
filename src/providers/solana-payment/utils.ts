import crypto from 'crypto';

export function generatePaymentId(): string {
  return `pid_${crypto.randomBytes(16).toString('hex')}`;
}

export function createPaymentDescription(
  orderId: string,
  amount: number,
  currencyCode: string,
  solAmount: number
): string {
  return `Payment for order ${orderId}: ${amount} ${currencyCode.toUpperCase()} (${solAmount} SOL)`;
}

/**
 * Checks if a given string is a valid Solana address.
 * A valid address is a base58 encoded string between 32 and 44 characters long.
 * @param address The address to validate.
 * @returns True if the address is a valid Solana address, false otherwise.
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Regular expression to check for base58 characters.
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  
  // Check if the address contains only base58 characters and has a length between 32 and 44.
  return base58Regex.test(address) && address.length >= 32 && address.length <= 44;
}
