import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Public } from '../../../../shared-kernel/infrastructure/decorators/public.decorator';
import { GetCurrentExchangeRateUseCase } from '../../application/use-cases/get-current-exchange-rate.use-case';
import { ExchangeRateResponseDto } from '../../application/dtos/exchange-rate-response.dto';

@ApiTags('Exchange Rates')
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    private readonly getCurrentExchangeRate: GetCurrentExchangeRateUseCase,
  ) {}

  @Public()
  @Get('current')
  @ApiOperation({
    summary: 'Obtener tasa de cambio local/USD vigente según moneda del país',
  })
  @ApiHeader({
    name: 'X-Currency',
    description: 'Código de moneda ISO 4217 (VES, ARS, CLP, PEN). Default: VES',
    required: false,
    example: 'VES',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasa de cambio actual',
    type: ExchangeRateResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio de tasa de cambio no disponible',
  })
  async getCurrent(@Headers('X-Currency') currency?: string) {
    return this.getCurrentExchangeRate.execute(currency);
  }
}
