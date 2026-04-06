import { ExchangeRate } from '../../domain/entities/exchange-rate.entity';
import { ExchangeRateResponseDto } from '../dtos/exchange-rate-response.dto';

export class ExchangeRateMapper {
  static toResponse(rate: ExchangeRate): ExchangeRateResponseDto {
    const dto = new ExchangeRateResponseDto();
    dto.rateLocalPerUsd = rate.rateLocalPerUsd;
    dto.source = rate.source;
    dto.fetchedAt = rate.fetchedAt;
    return dto;
  }
}
