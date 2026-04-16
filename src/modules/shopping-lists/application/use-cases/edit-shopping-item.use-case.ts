import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import {
  EXCHANGE_RATE_PROVIDER,
  type IExchangeRateProvider,
} from '../../../../shared-kernel/domain/interfaces/exchange-rate-provider.interface';
import { ShoppingListNotFoundException } from '../../domain/exceptions/shopping-list-not-found.exception';
import { ShoppingItemNotFoundException } from '../../domain/exceptions/shopping-item-not-found.exception';
import { EditShoppingItemDto } from '../dtos/edit-shopping-item.dto';
import { ShoppingListResponseDto } from '../dtos/shopping-list-response.dto';
import { ShoppingListMapper } from '../mappers/shopping-list.mapper';

interface EditShoppingItemInput {
  listId: string;
  itemId: string;
  userId: string;
  dto: EditShoppingItemDto;
}

@Injectable()
export class EditShoppingItemUseCase implements UseCase<
  EditShoppingItemInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}

  async execute(
    input: EditShoppingItemInput,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListRepository.findByIdAndUserId(
      input.listId,
      input.userId,
    );
    if (!list) {
      throw new ShoppingListNotFoundException(input.listId);
    }

    const item = list.items.find((i) => i.id === input.itemId);
    if (!item) {
      throw new ShoppingItemNotFoundException(input.itemId);
    }

    const exchangeRate = await this.exchangeRateProvider.getCurrent();

    const updatedItem = item.update(
      input.dto.productName ?? item.productName,
      input.dto.category ?? item.category,
      input.dto.unitPriceLocal ?? item.unitPriceLocal,
      input.dto.quantity ?? item.quantity,
      input.dto.unitPriceUsd ?? item.unitPriceUsd,
      exchangeRate.rateLocalPerUsd,
      input.dto.isPurchased ?? item.isPurchased,
    );

    const updatedList = list.replaceItem(updatedItem);
    const saved = await this.shoppingListRepository.save(updatedList);
    return ShoppingListMapper.toResponse(saved);
  }
}
