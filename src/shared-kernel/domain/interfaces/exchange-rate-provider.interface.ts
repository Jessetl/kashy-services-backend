export interface ExchangeRateSnapshot {
  rateLocalPerUsd: number;
  source: string;
  fetchedAt: Date;
}

export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER');

export interface IExchangeRateProvider {
  getCurrent(currency?: string): Promise<ExchangeRateSnapshot>;
}
