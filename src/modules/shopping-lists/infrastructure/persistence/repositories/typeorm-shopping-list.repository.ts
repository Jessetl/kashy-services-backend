import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type {
  IShoppingListRepository,
  PaginatedResult,
  SpendingStatRow,
} from '../../../domain/interfaces/repositories/shopping-list.repository.interface';
import { ShoppingList } from '../../../domain/entities/shopping-list.entity';
import { ShoppingItem } from '../../../domain/entities/shopping-item.entity';
import { ShoppingListStatus } from '../../../domain/enums/shopping-list-status.enum';
import { ShoppingListOrmEntity } from '../orm-entities/shopping-list.orm-entity';
import { ShoppingItemOrmEntity } from '../orm-entities/shopping-item.orm-entity';
import { ShoppingListPersistenceMapper } from '../mappers/shopping-list-persistence.mapper';

@Injectable()
export class TypeOrmShoppingListRepository implements IShoppingListRepository {
  constructor(
    @InjectRepository(ShoppingListOrmEntity)
    private readonly ormRepository: Repository<ShoppingListOrmEntity>,
    @InjectRepository(ShoppingItemOrmEntity)
    private readonly itemOrmRepository: Repository<ShoppingItemOrmEntity>,
  ) {}

  async findById(id: string): Promise<ShoppingList | null> {
    const orm = await this.ormRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    return orm ? ShoppingListPersistenceMapper.toDomain(orm) : null;
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<ShoppingList | null> {
    const orm = await this.ormRepository.findOne({
      where: { id, userId },
      relations: ['items'],
    });
    return orm ? ShoppingListPersistenceMapper.toDomain(orm) : null;
  }

  async findActiveByUserId(userId: string): Promise<ShoppingList[]> {
    const orms = await this.ormRepository.find({
      where: { userId, status: ShoppingListStatus.ACTIVE },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    return orms.map((orm) => ShoppingListPersistenceMapper.toDomain(orm));
  }

  async save(shoppingList: ShoppingList): Promise<ShoppingList> {
    const orm = ShoppingListPersistenceMapper.toOrm(shoppingList);
    const saved = await this.ormRepository.save(orm);

    // Reload con relaciones para devolver items completos
    const reloaded = await this.ormRepository.findOne({
      where: { id: saved.id },
      relations: ['items'],
    });

    return ShoppingListPersistenceMapper.toDomain(reloaded!);
  }

  async findCompletedByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ShoppingList>> {
    const [orms, total] = await this.ormRepository.findAndCount({
      where: { userId, status: ShoppingListStatus.COMPLETED },
      relations: ['items'],
      order: { completedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: orms.map((orm) => ShoppingListPersistenceMapper.toDomain(orm)),
      total,
      page,
      limit,
    };
  }

  async findByIdsAndUserId(
    ids: string[],
    userId: string,
  ): Promise<ShoppingList[]> {
    if (ids.length === 0) return [];

    const orms = await this.ormRepository.find({
      where: { id: In(ids), userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return orms.map((orm) => ShoppingListPersistenceMapper.toDomain(orm));
  }

  async getSpendingStats(
    userId: string,
    period: 'week' | 'month',
  ): Promise<SpendingStatRow[]> {
    const truncUnit = period === 'week' ? 'week' : 'month';

    const rows = await this.ormRepository
      .createQueryBuilder('sl')
      .select(`date_trunc('${truncUnit}', sl.completed_at)`, 'period')
      .addSelect('SUM(sl.total_ves)', 'totalVes')
      .addSelect('SUM(sl.total_usd)', 'totalUsd')
      .addSelect('COUNT(sl.id)', 'listCount')
      .where('sl.user_id = :userId', { userId })
      .andWhere('sl.status = :status', { status: ShoppingListStatus.COMPLETED })
      .andWhere('sl.completed_at IS NOT NULL')
      .groupBy('period')
      .orderBy('period', 'DESC')
      .limit(12)
      .getRawMany<{
        period: string;
        totalVes: string;
        totalUsd: string;
        listCount: string;
      }>();

    return rows.map((row) => ({
      period: row.period,
      totalVes: Number(row.totalVes),
      totalUsd: Number(row.totalUsd),
      listCount: Number(row.listCount),
    }));
  }

  async addItemsToList(
    listId: string,
    items: ShoppingItem[],
    newTotalLocal: number,
    newTotalUsd: number,
  ): Promise<ShoppingItem[]> {
    const itemOrms = items.map((item) =>
      ShoppingListPersistenceMapper.toItemOrm(item),
    );

    const savedOrms = await this.itemOrmRepository.save(itemOrms);

    await this.ormRepository.update(listId, {
      totalLocal: newTotalLocal,
      totalUsd: newTotalUsd,
    });

    return savedOrms.map((orm) =>
      ShoppingItem.reconstitute(orm.id, {
        listId: orm.listId,
        productName: orm.productName,
        category: orm.category,
        unitPriceLocal: Number(orm.unitPriceLocal),
        quantity: orm.quantity,
        totalLocal: Number(orm.totalLocal),
        unitPriceUsd:
          orm.unitPriceUsd !== null ? Number(orm.unitPriceUsd) : null,
        totalUsd: orm.totalUsd !== null ? Number(orm.totalUsd) : null,
        isPurchased: orm.isPurchased,
        createdAt: orm.createdAt,
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete(id);
  }
}
