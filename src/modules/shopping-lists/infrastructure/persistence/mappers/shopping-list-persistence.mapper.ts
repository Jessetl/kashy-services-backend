import { ShoppingList } from '../../../domain/entities/shopping-list.entity';
import { ShoppingItem } from '../../../domain/entities/shopping-item.entity';
import { ShoppingListOrmEntity } from '../orm-entities/shopping-list.orm-entity';
import { ShoppingItemOrmEntity } from '../orm-entities/shopping-item.orm-entity';

export class ShoppingListPersistenceMapper {
  static toDomain(orm: ShoppingListOrmEntity): ShoppingList {
    const items = (orm.items ?? []).map((itemOrm) =>
      ShoppingItem.reconstitute(itemOrm.id, {
        listId: itemOrm.listId,
        productName: itemOrm.productName,
        category: itemOrm.category,
        unitPriceLocal: Number(itemOrm.unitPriceLocal),
        quantity: itemOrm.quantity,
        totalLocal: Number(itemOrm.totalLocal),
        unitPriceUsd:
          itemOrm.unitPriceUsd !== null ? Number(itemOrm.unitPriceUsd) : null,
        totalUsd: itemOrm.totalUsd !== null ? Number(itemOrm.totalUsd) : null,
        isPurchased: itemOrm.isPurchased,
        createdAt: itemOrm.createdAt,
      }),
    );

    return ShoppingList.reconstitute(orm.id, {
      userId: orm.userId,
      name: orm.name,
      storeName: orm.storeName,
      status: orm.status,
      ivaEnabled: orm.ivaEnabled,
      totalLocal: Number(orm.totalLocal),
      totalUsd: Number(orm.totalUsd),
      exchangeRateSnapshot:
        orm.exchangeRateSnapshot !== null
          ? Number(orm.exchangeRateSnapshot)
          : null,
      createdAt: orm.createdAt,
      completedAt: orm.completedAt,
      items,
    });
  }

  static toOrm(list: ShoppingList): ShoppingListOrmEntity {
    const orm = new ShoppingListOrmEntity();
    orm.id = list.id;
    orm.userId = list.userId;
    orm.name = list.name;
    orm.storeName = list.storeName;
    orm.status = list.status;
    orm.ivaEnabled = list.ivaEnabled;
    orm.totalLocal = list.totalLocal;
    orm.totalUsd = list.totalUsd;
    orm.exchangeRateSnapshot = list.exchangeRateSnapshot;
    orm.createdAt = list.createdAt;
    orm.completedAt = list.completedAt;
    orm.items = list.items.map((item) => this.toItemOrm(item));
    return orm;
  }

  static toItemOrm(item: ShoppingItem): ShoppingItemOrmEntity {
    const orm = new ShoppingItemOrmEntity();
    orm.id = item.id;
    orm.listId = item.listId;
    orm.productName = item.productName;
    orm.category = item.category;
    orm.unitPriceLocal = item.unitPriceLocal;
    orm.quantity = item.quantity;
    orm.totalLocal = item.totalLocal;
    orm.unitPriceUsd = item.unitPriceUsd;
    orm.totalUsd = item.totalUsd;
    orm.isPurchased = item.isPurchased;
    orm.createdAt = item.createdAt;
    return orm;
  }
}
