/**
 * Custom error class for Solana payment provider
 */
export class SolanaPaymentError extends Error {
  static Types = {
    INVALID_DATA: 'invalid_data',
    NOT_FOUND: 'not_found',
    UNAUTHORIZED: 'unauthorized',
    CONFLICT: 'conflict',
    DB_ERROR: 'db_error',
    UNEXPECTED_STATE: 'unexpected_state',
    INVALID_ARGUMENT: 'invalid_argument',
    PAYMENT_ERROR: 'payment_error',
  };

  type: string;
  code: number;

  constructor(type: string, message: string, code = 400) {
    super(message);
    this.type = type;
    this.code = code;
    this.name = 'SolanaPaymentError';
  }
}
