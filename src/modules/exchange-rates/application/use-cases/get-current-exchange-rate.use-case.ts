import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import {
  EXCHANGE_RATE_PROVIDER,
  type IExchangeRateProvider,
} from '../../../../shared-kernel/domain/interfaces/exchange-rate-provider.interface';
import { ExchangeRateResponseDto } from '../dtos/exchange-rate-response.dto';
import { ExchangeRateMapper } from '../mappers/exchange-rate.mapper';
import {
  getCurrencyConfig,
  DEFAULT_COUNTRY,
} from '../../domain/config/country-currency.config';

@Injectable()
export class GetCurrentExchangeRateUseCase implements UseCase<
  string | undefined,
  ExchangeRateResponseDto
> {
  constructor(
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}

  async execute(currency?: string): Promise<ExchangeRateResponseDto> {
    const resolved = currency ?? DEFAULT_COUNTRY;
    const config = getCurrencyConfig(resolved);
    const rate = await this.exchangeRateProvider.getCurrent(resolved);
    return ExchangeRateMapper.toResponse(rate, config.currency);
  }
}
