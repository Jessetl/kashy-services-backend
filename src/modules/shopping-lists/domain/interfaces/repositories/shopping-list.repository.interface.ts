import { ShoppingList } from '../../entities/shopping-list.entity';
import { ShoppingItem } from '../../entities/shopping-item.entity';

export const SHOPPING_LIST_REPOSITORY = Symbol('SHOPPING_LIST_REPOSITORY');

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SpendingStatRow {
  period: string;
  totalLocal: number;
  totalUsd: number;
  listCount: number;
}

export interface IShoppingListRepository {
  findById(id: string): Promise<ShoppingList | null>;
  findByIdAndUserId(id: string, userId: string): Promise<ShoppingList | null>;
  findActiveByUserId(userId: string): Promise<ShoppingList[]>;
  findCompletedByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ShoppingList>>;
  findByIdsAndUserId(ids: string[], userId: string): Promise<ShoppingList[]>;
  getSpendingStats(
    userId: string,
    period: 'week' | 'month',
  ): Promise<SpendingStatRow[]>;
  save(shoppingList: ShoppingList): Promise<ShoppingList>;
  addItemsToList(
    listId: string,
    items: ShoppingItem[],
    newTotalLocal: number,
    newTotalUsd: number,
  ): Promise<ShoppingItem[]>;
  delete(id: string): Promise<void>;
}
