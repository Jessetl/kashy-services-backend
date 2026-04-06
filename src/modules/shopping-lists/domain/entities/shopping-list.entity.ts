import { BaseEntity } from '../../../../shared-kernel/domain/base-entity';
import { ShoppingListStatus } from '../enums/shopping-list-status.enum';
import { ShoppingItem } from './shopping-item.entity';

interface ShoppingListProps {
  userId: string;
  name: string;
  storeName: string | null;
  status: ShoppingListStatus;
  ivaEnabled: boolean;
  totalLocal: number;
  totalUsd: number;
  exchangeRateSnapshot: number | null;
  createdAt: Date;
  completedAt: Date | null;
  items: ShoppingItem[];
}

export class ShoppingList extends BaseEntity {
  readonly userId: string;
  readonly name: string;
  readonly storeName: string | null;
  readonly status: ShoppingListStatus;
  readonly ivaEnabled: boolean;
  readonly totalLocal: number;
  readonly totalUsd: number;
  readonly exchangeRateSnapshot: number | null;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly items: ShoppingItem[];

  private constructor(id: string, props: ShoppingListProps) {
    super(id);
    this.userId = props.userId;
    this.name = props.name;
    this.storeName = props.storeName;
    this.status = props.status;
    this.ivaEnabled = props.ivaEnabled;
    this.totalLocal = props.totalLocal;
    this.totalUsd = props.totalUsd;
    this.exchangeRateSnapshot = props.exchangeRateSnapshot;
    this.createdAt = props.createdAt;
    this.completedAt = props.completedAt;
    this.items = props.items;
  }

  static create(
    id: string,
    userId: string,
    name: string,
    storeName: string | null = null,
    ivaEnabled: boolean = false,
    items: ShoppingItem[] = [],
    exchangeRateSnapshot: number | null = null,
  ): ShoppingList {
    const totalLocal = items.reduce((sum, item) => sum + item.totalLocal, 0);
    const totalUsd = items.reduce((sum, item) => sum + (item.totalUsd ?? 0), 0);

    return new ShoppingList(id, {
      userId,
      name,
      storeName,
      status: ShoppingListStatus.ACTIVE,
      ivaEnabled,
      totalLocal,
      totalUsd,
      exchangeRateSnapshot,
      createdAt: new Date(),
      completedAt: null,
      items,
    });
  }

  addItems(newItems: ShoppingItem[]): ShoppingList {
    const allItems = [...this.items, ...newItems];
    const totalLocal = allItems.reduce((sum, item) => sum + item.totalLocal, 0);
    const totalUsd = allItems.reduce(
      (sum, item) => sum + (item.totalUsd ?? 0),
      0,
    );

    return new ShoppingList(this.id, {
      userId: this.userId,
      name: this.name,
      storeName: this.storeName,
      status: this.status,
      ivaEnabled: this.ivaEnabled,
      totalLocal,
      totalUsd,
      exchangeRateSnapshot: this.exchangeRateSnapshot,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      items: allItems,
    });
  }

  complete(exchangeRateSnapshot: number): ShoppingList {
    return new ShoppingList(this.id, {
      userId: this.userId,
      name: this.name,
      storeName: this.storeName,
      status: ShoppingListStatus.COMPLETED,
      ivaEnabled: this.ivaEnabled,
      totalLocal: this.totalLocal,
      totalUsd: this.totalUsd,
      exchangeRateSnapshot,
      createdAt: this.createdAt,
      completedAt: new Date(),
      items: this.items,
    });
  }

  duplicate(newId: string, newItemIds: string[]): ShoppingList {
    const newItems = this.items.map((item, index) =>
      ShoppingItem.reconstitute(newItemIds[index], {
        listId: newId,
        productName: item.productName,
        category: item.category,
        unitPriceLocal: item.unitPriceLocal,
        quantity: item.quantity,
        totalLocal: item.totalLocal,
        unitPriceUsd: item.unitPriceUsd,
        totalUsd: item.totalUsd,
        isPurchased: false,
        createdAt: new Date(),
      }),
    );

    return ShoppingList.create(
      newId,
      this.userId,
      this.name,
      this.storeName,
      this.ivaEnabled,
      newItems,
      this.exchangeRateSnapshot,
    );
  }

  removeItem(itemId: string): ShoppingList {
    const filtered = this.items.filter((item) => item.id !== itemId);
    return this.withRecalculatedItems(filtered);
  }

  replaceItem(updatedItem: ShoppingItem): ShoppingList {
    const items = this.items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item,
    );
    return this.withRecalculatedItems(items);
  }

  private withRecalculatedItems(items: ShoppingItem[]): ShoppingList {
    const totalLocal = items.reduce((sum, item) => sum + item.totalLocal, 0);
    const totalUsd = items.reduce((sum, item) => sum + (item.totalUsd ?? 0), 0);

    return new ShoppingList(this.id, {
      userId: this.userId,
      name: this.name,
      storeName: this.storeName,
      status: this.status,
      ivaEnabled: this.ivaEnabled,
      totalLocal,
      totalUsd,
      exchangeRateSnapshot: this.exchangeRateSnapshot,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      items,
    });
  }

  static reconstitute(id: string, props: ShoppingListProps): ShoppingList {
    return new ShoppingList(id, props);
  }
}
