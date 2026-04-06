import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { PaginatedShoppingListsResponseDto } from '../dtos/paginated-shopping-lists-response.dto';
import { ShoppingListMapper } from '../mappers/shopping-list.mapper';

interface GetShoppingListHistoryInput {
  userId: string;
  page: number;
  limit: number;
}

@Injectable()
export class GetShoppingListHistoryUseCase implements UseCase<
  GetShoppingListHistoryInput,
  PaginatedShoppingListsResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(
    input: GetShoppingListHistoryInput,
  ): Promise<PaginatedShoppingListsResponseDto> {
    const result = await this.shoppingListRepository.findCompletedByUserId(
      input.userId,
      input.page,
      input.limit,
    );

    const dto = new PaginatedShoppingListsResponseDto();
    dto.data = result.data.map((list) => ShoppingListMapper.toResponse(list));
    dto.total = result.total;
    dto.page = result.page;
    dto.limit = result.limit;
    return dto;
  }
}
