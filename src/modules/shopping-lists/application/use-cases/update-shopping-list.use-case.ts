import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import type { IExchangeRateProvider } from '../../../exchange-rates/domain/interfaces/exchange-rate-provider.interface';
import { EXCHANGE_RATE_PROVIDER } from '../../../exchange-rates/domain/interfaces/exchange-rate-provider.interface';
import { ShoppingList } from '../../domain/entities/shopping-list.entity';
import { ShoppingItem } from '../../domain/entities/shopping-item.entity';
import { UpdateShoppingListDto } from '../dtos/update-shopping-list.dto';
import { ShoppingListResponseDto } from '../dtos/shopping-list-response.dto';
import { ShoppingListMapper } from '../mappers/shopping-list.mapper';
import { ShoppingListNotFoundException } from '../../domain/exceptions/shopping-list-not-found.exception';

interface UpdateShoppingListInput {
  listId: string;
  userId: string;
  dto: UpdateShoppingListDto;
}

@Injectable()
export class UpdateShoppingListUseCase implements UseCase<
  UpdateShoppingListInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}

  async execute(
    input: UpdateShoppingListInput,
  ): Promise<ShoppingListResponseDto> {
    const existing = await this.shoppingListRepository.findByIdAndUserId(
      input.listId,
      input.userId,
    );

    if (!existing) {
      throw new ShoppingListNotFoundException(input.listId);
    }

    const itemsChanged = input.dto.items !== undefined;

    let items: ShoppingItem[] = existing.items;
    let rateLocalPerUsd = existing.exchangeRateSnapshot;

    if (itemsChanged) {
      // Obtener tasa vigente para items nuevos/actualizados
      const exchangeRate = await this.exchangeRateProvider.getCurrent();
      rateLocalPerUsd = exchangeRate.rateLocalPerUsd;

      const existingItemsMap = new Map(
        existing.items.map((item) => [item.id, item]),
      );

      items = (input.dto.items ?? []).map((itemDto) => {
        if (itemDto.id && existingItemsMap.has(itemDto.id)) {
          // Actualizar item existente: recrear con nuevos valores
          const existingItem = existingItemsMap.get(itemDto.id)!;
          return ShoppingItem.create(
            existingItem.id,
            existing.id,
            itemDto.productName,
            itemDto.category,
            itemDto.unitPriceLocal,
            itemDto.quantity ?? 1,
            itemDto.unitPriceUsd ?? null,
            rateLocalPerUsd,
            itemDto.isPurchased ?? existingItem.isPurchased,
          );
        }

        // Item nuevo
        return ShoppingItem.create(
          randomUUID(),
          existing.id,
          itemDto.productName,
          itemDto.category,
          itemDto.unitPriceLocal,
          itemDto.quantity ?? 1,
          itemDto.unitPriceUsd ?? null,
          rateLocalPerUsd,
          itemDto.isPurchased ?? false,
        );
      });
    }

    // Recalcular totales si items cambiaron
    const totalLocal = itemsChanged
      ? items.reduce((sum, item) => sum + item.totalLocal, 0)
      : existing.totalLocal;

    const totalUsd = itemsChanged
      ? items.reduce((sum, item) => sum + (item.totalUsd ?? 0), 0)
      : existing.totalUsd;

    const updated = ShoppingList.reconstitute(existing.id, {
      userId: existing.userId,
      name: input.dto.name ?? existing.name,
      storeName:
        input.dto.storeName !== undefined
          ? input.dto.storeName
          : existing.storeName,
      status: existing.status,
      ivaEnabled: input.dto.ivaEnabled ?? existing.ivaEnabled,
      totalLocal,
      totalUsd,
      exchangeRateSnapshot: rateLocalPerUsd,
      createdAt: existing.createdAt,
      completedAt: existing.completedAt,
      items,
    });

    const saved = await this.shoppingListRepository.save(updated);
    return ShoppingListMapper.toResponse(saved);
  }
}
