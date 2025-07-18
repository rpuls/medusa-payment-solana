import { CurrencyConverter } from './currency-converter';

export class CoinGeckoConverter implements CurrencyConverter {
  private apiKey: string;
  private cache: { rate: number; timestamp: number } | null = null;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('CoinGecko API key is required');
    }
    this.apiKey = apiKey;
  }

  async convertToSol(amount: number, currencyCode: string): Promise<number> {
    const rate = await this.getRate(currencyCode);
    return parseFloat((amount / rate).toFixed(9));
  }

  private async getRate(currencyCode: string): Promise<number> {
    // Use cached rate if available and not expired
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
      return this.cache.rate;
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${currencyCode.toLowerCase()}`,
        {
          headers: {
            'x-cg-demo-api-key': this.apiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rate = data.solana?.[currencyCode.toLowerCase()];

      if (!rate) {
        throw new Error(`Invalid rate data for ${currencyCode}`);
      }

      // Update cache
      this.cache = {
        rate,
        timestamp: Date.now()
      };

      return rate;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch SOL/${currencyCode} rate: ${error.message}`);
      }
      throw new Error(`Failed to fetch SOL/${currencyCode} rate`);
    }
  }
}
