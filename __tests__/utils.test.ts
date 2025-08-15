import { isValidSolanaAddress } from '../src/providers/solana-payment/utils';

describe('isValidSolanaAddress', () => {
  it('should return true for a valid Solana address', () => {
    const validAddress = 'So11111111111111111111111111111111111111112'; // Example: SOL token address
    expect(isValidSolanaAddress(validAddress)).toBe(true);
  });

  it('should return true for another valid Solana address', () => {
    const validAddress = '4pUQS4sjwG4y3Gv5Uvj3u3a1YwSA3s6a3a3a3a3a3a3a3a3a3a3a'; // Example of a valid length address
    expect(isValidSolanaAddress(validAddress.slice(0, 44))).toBe(true);
  });

  it('should return false for an address with non-base58 characters', () => {
    const invalidAddress = 'So111111111111111111111111111111111111111O0'; // Contains 'O' and '0'
    expect(isValidSolanaAddress(invalidAddress)).toBe(false);
  });

  it('should return false for an address that is too short', () => {
    const shortAddress = 'So11111111111111111111111111111';
    expect(isValidSolanaAddress(shortAddress)).toBe(false);
  });

  it('should return false for an address that is too long', () => {
    const longAddress = 'So1111111111111111111111111111111111111111222222';
    expect(isValidSolanaAddress(longAddress)).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(isValidSolanaAddress('')).toBe(false);
  });

  it('should return false for a null value', () => {
    expect(isValidSolanaAddress(null as any)).toBe(false);
  });

  it('should return false for an undefined value', () => {
    expect(isValidSolanaAddress(undefined as any)).toBe(false);
  });

  it('should return false for a non-string value', () => {
    expect(isValidSolanaAddress(12345 as any)).toBe(false);
  });
});
