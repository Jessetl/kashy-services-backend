import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { ShoppingListNotFoundException } from '../../domain/exceptions/shopping-list-not-found.exception';
import { ShoppingListResponseDto } from '../dtos/shopping-list-response.dto';
import { ShoppingListMapper } from '../mappers/shopping-list.mapper';

interface DuplicateShoppingListInput {
  listId: string;
  userId: string;
}

@Injectable()
export class DuplicateShoppingListUseCase implements UseCase<
  DuplicateShoppingListInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(
    input: DuplicateShoppingListInput,
  ): Promise<ShoppingListResponseDto> {
    const original = await this.shoppingListRepository.findByIdAndUserId(
      input.listId,
      input.userId,
    );
    if (!original) throw new ShoppingListNotFoundException(input.listId);

    const newId = randomUUID();
    const newItemIds = original.items.map(() => randomUUID());
    const duplicated = original.duplicate(newId, newItemIds);

    const saved = await this.shoppingListRepository.save(duplicated);
    return ShoppingListMapper.toResponse(saved);
  }
}
