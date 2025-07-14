import { DefaultConverter } from '../src/modules/solana-payment/currency-converter';

describe('DefaultConverter', () => {
  let converter: DefaultConverter;

  beforeEach(() => {
    converter = new DefaultConverter();
  });

  it('should convert USD to SOL correctly', async () => {
    const solAmount = await converter.convertToSol(100, 'usd');
    expect(solAmount).toBe(0.75); // 100 * 0.0075
  });

  it('should convert EUR to SOL correctly', async () => {
    const solAmount = await converter.convertToSol(100, 'eur');
    expect(solAmount).toBe(0.8); // 100 * 0.008
  });

  it('should return NaN for unsupported currencies', async () => {
    const solAmount = await converter.convertToSol(100, 'gbp');
    expect(solAmount).toBeNaN();
  });
});
