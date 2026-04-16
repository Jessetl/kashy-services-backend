import { BaseEntity } from '../../../../shared-kernel/domain/base-entity';

interface ShoppingItemProps {
  listId: string;
  productName: string;
  category: string;
  unitPriceLocal: number;
  quantity: number;
  totalLocal: number;
  unitPriceUsd: number | null;
  totalUsd: number | null;
  isPurchased: boolean;
  createdAt: Date;
}

export class ShoppingItem extends BaseEntity {
  readonly listId: string;
  readonly productName: string;
  readonly category: string;
  readonly unitPriceLocal: number;
  readonly quantity: number;
  readonly totalLocal: number;
  readonly unitPriceUsd: number | null;
  readonly totalUsd: number | null;
  readonly isPurchased: boolean;
  readonly createdAt: Date;

  private constructor(id: string, props: ShoppingItemProps) {
    super(id);
    this.listId = props.listId;
    this.productName = props.productName;
    this.category = props.category;
    this.unitPriceLocal = props.unitPriceLocal;
    this.quantity = props.quantity;
    this.totalLocal = props.totalLocal;
    this.unitPriceUsd = props.unitPriceUsd;
    this.totalUsd = props.totalUsd;
    this.isPurchased = props.isPurchased;
    this.createdAt = props.createdAt;
  }

  /**
   * @param unitPriceUsd Si es null y rateLocalPerUsd esta disponible, se calcula automaticamente.
   * @param rateLocalPerUsd Tasa local/USD vigente para conversion automatica.
   * @param isPurchased Estado de compra (default false para items nuevos).
   */
  static create(
    id: string,
    listId: string,
    productName: string,
    category: string,
    unitPriceLocal: number,
    quantity: number,
    unitPriceUsd: number | null = null,
    rateLocalPerUsd: number | null = null,
    isPurchased: boolean = false,
  ): ShoppingItem {
    const totalLocal = unitPriceLocal * quantity;

    // Si no se envia USD pero hay tasa disponible, calcular automaticamente
    let resolvedUnitPriceUsd = unitPriceUsd;
    if (
      resolvedUnitPriceUsd === null &&
      rateLocalPerUsd !== null &&
      rateLocalPerUsd > 0
    ) {
      resolvedUnitPriceUsd = unitPriceLocal / rateLocalPerUsd;
    }

    const totalUsd =
      resolvedUnitPriceUsd !== null ? resolvedUnitPriceUsd * quantity : null;

    return new ShoppingItem(id, {
      listId,
      productName,
      category,
      unitPriceLocal,
      quantity,
      totalLocal,
      unitPriceUsd: resolvedUnitPriceUsd,
      totalUsd,
      isPurchased,
      createdAt: new Date(),
    });
  }

  togglePurchased(): ShoppingItem {
    return new ShoppingItem(this.id, {
      listId: this.listId,
      productName: this.productName,
      category: this.category,
      unitPriceLocal: this.unitPriceLocal,
      quantity: this.quantity,
      totalLocal: this.totalLocal,
      unitPriceUsd: this.unitPriceUsd,
      totalUsd: this.totalUsd,
      isPurchased: !this.isPurchased,
      createdAt: this.createdAt,
    });
  }

  update(
    productName: string,
    category: string,
    unitPriceLocal: number,
    quantity: number,
    unitPriceUsd: number | null,
    rateLocalPerUsd: number | null,
    isPurchased: boolean,
  ): ShoppingItem {
    return ShoppingItem.create(
      this.id,
      this.listId,
      productName,
      category,
      unitPriceLocal,
      quantity,
      unitPriceUsd,
      rateLocalPerUsd,
      isPurchased,
    );
  }

  static reconstitute(id: string, props: ShoppingItemProps): ShoppingItem {
    return new ShoppingItem(id, props);
  }
}
