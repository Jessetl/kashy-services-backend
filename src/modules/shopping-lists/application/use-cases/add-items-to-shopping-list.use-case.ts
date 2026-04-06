import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import type { IExchangeRateProvider } from '../../../exchange-rates/domain/interfaces/exchange-rate-provider.interface';
import { EXCHANGE_RATE_PROVIDER } from '../../../exchange-rates/domain/interfaces/exchange-rate-provider.interface';
import { ShoppingItem } from '../../domain/entities/shopping-item.entity';
import { ShoppingListNotFoundException } from '../../domain/exceptions/shopping-list-not-found.exception';
import { CreateShoppingItemDto } from '../dtos/create-shopping-item.dto';
import { ShoppingItemResponseDto } from '../dtos/shopping-item-response.dto';
import { ShoppingListMapper } from '../mappers/shopping-list.mapper';

interface AddItemsInput {
  listId: string;
  userId: string;
  items: CreateShoppingItemDto[];
}

@Injectable()
export class AddItemsToShoppingListUseCase implements UseCase<
  AddItemsInput,
  ShoppingItemResponseDto[]
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}

  async execute(input: AddItemsInput): Promise<ShoppingItemResponseDto[]> {
    const list = await this.shoppingListRepository.findByIdAndUserId(
      input.listId,
      input.userId,
    );

    if (!list) {
      throw new ShoppingListNotFoundException(input.listId);
    }

    const exchangeRate = await this.exchangeRateProvider.getCurrent();
    const rateLocalPerUsd = exchangeRate.rateLocalPerUsd;

    const newItems = input.items.map((itemDto) =>
      ShoppingItem.create(
        randomUUID(),
        input.listId,
        itemDto.productName,
        itemDto.category,
        itemDto.unitPriceLocal,
        itemDto.quantity ?? 1,
        itemDto.unitPriceUsd ?? null,
        rateLocalPerUsd,
      ),
    );

    const updatedList = list.addItems(newItems);

    const savedItems = await this.shoppingListRepository.addItemsToList(
      input.listId,
      newItems,
      updatedList.totalLocal,
      updatedList.totalUsd,
    );

    return savedItems.map((item) => ShoppingListMapper.toItemResponse(item));
  }
}
