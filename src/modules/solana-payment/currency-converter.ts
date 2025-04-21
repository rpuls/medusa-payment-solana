export interface CurrencyConverter {
  convertToSol(amount: number, currencyCode: string): Promise<number>;
}

export class DefaultConverter implements CurrencyConverter {
  private rates = {
    usd: 0.0075,
    eur: 0.008
  };

  async convertToSol(amount: number, currencyCode: string): Promise<number> {
    const rate = this.rates[currencyCode.toLowerCase() as keyof typeof this.rates];
    return parseFloat((amount * rate).toFixed(9));
  }
}
