import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { ShoppingListNotFoundException } from '../../domain/exceptions/shopping-list-not-found.exception';
import { ShoppingItemNotFoundException } from '../../domain/exceptions/shopping-item-not-found.exception';
import { ShoppingListResponseDto } from '../dtos/shopping-list-response.dto';
import { ShoppingListMapper } from '../mappers/shopping-list.mapper';

interface ToggleShoppingItemInput {
  listId: string;
  itemId: string;
  userId: string;
}

@Injectable()
export class ToggleShoppingItemUseCase implements UseCase<
  ToggleShoppingItemInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(
    input: ToggleShoppingItemInput,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListRepository.findByIdAndUserId(
      input.listId,
      input.userId,
    );
    if (!list) throw new ShoppingListNotFoundException(input.listId);

    const item = list.items.find((i) => i.id === input.itemId);
    if (!item) throw new ShoppingItemNotFoundException(input.itemId);

    const toggledItem = item.togglePurchased();
    const updatedList = list.replaceItem(toggledItem);
    const saved = await this.shoppingListRepository.save(updatedList);
    return ShoppingListMapper.toResponse(saved);
  }
}
