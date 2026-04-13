import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IExchangeRateProvider } from '../../../../shared-kernel/domain/interfaces/exchange-rate-provider.interface';
import { ExchangeRate } from '../../domain/entities/exchange-rate.entity';
import type { DolarApiResponse } from '../../domain/types/dolar-api-response.type';
import {
  getCurrencyConfig,
  DEFAULT_COUNTRY,
} from '../../domain/config/country-currency.config';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception';

const FETCH_TIMEOUT_MS = 10_000;

@Injectable()
export class DolarApiExchangeRateProvider implements IExchangeRateProvider {
  private readonly logger = new Logger(DolarApiExchangeRateProvider.name);

  /**
   * Última tasa conocida por currency como fallback de último recurso.
   * Cumple regla irrompible #3: "La app nunca muestra tasa no disponible".
   */
  private readonly lastKnownRates = new Map<string, ExchangeRate>();

  async getCurrent(currency: string = DEFAULT_COUNTRY): Promise<ExchangeRate> {
    const config = getCurrencyConfig(currency);

    try {
      const rate = await this.fetchFromApi(
        config.apiUrl,
        config.rateField,
        config.currency,
      );
      this.lastKnownRates.set(config.currency, rate);
      return rate;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch exchange rate for ${config.currency}: ${error instanceof Error ? error.message : String(error)}`,
      );

      const fallback = this.lastKnownRates.get(config.currency);
      if (fallback) {
        this.logger.warn(
          `Using last known rate for ${config.currency} as fallback`,
        );
        return fallback;
      }

      throw new ExternalServiceException(
        'DolarAPI',
        `No se pudo obtener la tasa de cambio para ${config.currency}`,
      );
    }
  }

  private async fetchFromApi(
    url: string,
    rateField: 'promedio' | 'venta' | 'compra',
    currency: string,
  ): Promise<ExchangeRate> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as DolarApiResponse;
      const rate = data[rateField] ?? data.promedio;

      if (!rate || rate <= 0) {
        throw new Error(`Invalid rate value for ${currency}: ${String(rate)}`);
      }

      return ExchangeRate.create(randomUUID(), rate, data.fuente ?? currency);
    } finally {
      clearTimeout(timeout);
    }
  }
}
