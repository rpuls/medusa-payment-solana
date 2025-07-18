export interface CurrencyConverter {
  convertToSol(amount: number, currencyCode: string): Promise<number>;
}

export class DefaultConverter implements CurrencyConverter {
  private rates = {
    usd: 0.0075,
    eur: 0.008
  };

  constructor() {
    // Bind the convertToSol method to ensure proper this context
    this.convertToSol = this.convertToSol.bind(this);
  }

  async convertToSol(amount: number, currencyCode: string): Promise<number> {
    const rate = this.rates[currencyCode.toLowerCase() as keyof typeof this.rates];
    return parseFloat((amount * rate).toFixed(9));
  }
}
