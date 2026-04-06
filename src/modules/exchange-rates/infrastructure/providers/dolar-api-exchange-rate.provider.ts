import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { IExchangeRateProvider } from '../../domain/interfaces/exchange-rate-provider.interface';
import { ExchangeRate } from '../../domain/entities/exchange-rate.entity';
import type { DolarApiResponse } from '../../domain/types/dolar-api-response.type';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception';

const DEFAULT_DOLAR_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const CACHE_KEY = 'exchange_rate:current';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 horas (segun ARCHITECTURE_MASTER.md §5)
const FETCH_TIMEOUT_MS = 10_000;

@Injectable()
export class DolarApiExchangeRateProvider implements IExchangeRateProvider {
  private readonly logger = new Logger(DolarApiExchangeRateProvider.name);
  private readonly dolarApiUrl: string;

  /**
   * Ultima tasa valida en memoria como fallback de ultimo recurso.
   * Cumple regla irrompible #3: "La app nunca muestra tasa no disponible".
   */
  private lastKnownRate: ExchangeRate | null = null;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.dolarApiUrl = this.configService.get<string>(
      'DOLAR_API_URL',
      DEFAULT_DOLAR_API_URL,
    );
  }

  async getCurrent(): Promise<ExchangeRate> {
    // 1. Intentar cache
    const cached = await this.cacheManager.get<{
      rateLocalPerUsd: number;
      source: string;
      fetchedAt: string;
    }>(CACHE_KEY);

    if (cached) {
      const rate = ExchangeRate.reconstitute(randomUUID(), {
        rateLocalPerUsd: cached.rateLocalPerUsd,
        source: cached.source,
        fetchedAt: new Date(cached.fetchedAt),
      });
      this.lastKnownRate = rate;
      return rate;
    }

    // 2. Fetch desde API externa
    try {
      const rate = await this.fetchFromApi();
      this.lastKnownRate = rate;

      await this.cacheManager.set(
        CACHE_KEY,
        {
          rateLocalPerUsd: rate.rateLocalPerUsd,
          source: rate.source,
          fetchedAt: rate.fetchedAt.toISOString(),
        },
        CACHE_TTL_MS,
      );

      return rate;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch exchange rate from DolarAPI: ${error instanceof Error ? error.message : String(error)}`,
      );

      // 3. Fallback: ultima tasa conocida en memoria
      if (this.lastKnownRate) {
        this.logger.warn('Using last known exchange rate as fallback');
        return this.lastKnownRate;
      }

      throw new ExternalServiceException(
        'DolarAPI',
        'No se pudo obtener la tasa de cambio y no hay tasa en cache',
      );
    }
  }

  private async fetchFromApi(): Promise<ExchangeRate> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(this.dolarApiUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as DolarApiResponse;

      if (!data.promedio || data.promedio <= 0) {
        throw new Error(`Invalid rate value: ${String(data.promedio)}`);
      }

      return ExchangeRate.create(randomUUID(), data.promedio, data.fuente);
    } finally {
      clearTimeout(timeout);
    }
  }
}
