import { BaseEntity } from '../../../../shared-kernel/domain/base-entity';

interface ExchangeRateProps {
  rateLocalPerUsd: number;
  source: string;
  fetchedAt: Date;
}

export class ExchangeRate extends BaseEntity {
  readonly rateLocalPerUsd: number;
  readonly source: string;
  readonly fetchedAt: Date;

  private constructor(id: string, props: ExchangeRateProps) {
    super(id);
    this.rateLocalPerUsd = props.rateLocalPerUsd;
    this.source = props.source;
    this.fetchedAt = props.fetchedAt;
  }

  static create(
    id: string,
    rateLocalPerUsd: number,
    source: string,
  ): ExchangeRate {
    return new ExchangeRate(id, {
      rateLocalPerUsd,
      source,
      fetchedAt: new Date(),
    });
  }

  static reconstitute(id: string, props: ExchangeRateProps): ExchangeRate {
    return new ExchangeRate(id, props);
  }

  /**
   * Convierte un monto en la moneda local a USD usando esta tasa.
   */
  convertLocalToUsd(amountLocal: number): number {
    if (this.rateLocalPerUsd === 0) {
      return 0;
    }
    return amountLocal / this.rateLocalPerUsd;
  }
}
