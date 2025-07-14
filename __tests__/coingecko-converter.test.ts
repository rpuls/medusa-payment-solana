import { CoinGeckoConverter } from '../src/modules/solana-payment/coingecko-converter';

global.fetch = jest.fn();

describe('CoinGeckoConverter', () => {
  let converter: CoinGeckoConverter;

  beforeEach(() => {
    converter = new CoinGeckoConverter('test_api_key');
    (fetch as jest.Mock).mockClear();
  });

  it('should convert USD to SOL correctly', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        solana: {
          usd: 130,
        },
      }),
    });

    const solAmount = await converter.convertToSol(100, 'usd');
    expect(solAmount).toBeCloseTo(100 / 130);
  });

  it('should throw an error if the API call fails', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'API Error',
    });

    await expect(converter.convertToSol(100, 'usd')).rejects.toThrow(
      'Failed to fetch SOL/usd rate: CoinGecko API error: API Error'
    );
  });

  it('should throw an error for unsupported currencies', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        solana: {
          eur: 120,
        },
      }),
    });

    await expect(converter.convertToSol(100, 'gbp')).rejects.toThrow(
      'Failed to fetch SOL/gbp rate: Invalid rate data for gbp'
    );
  });
});
