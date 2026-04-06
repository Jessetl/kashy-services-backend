import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import {
  CompareShoppingListsResponseDto,
  CompareItemPriceDto,
  CompareItemListPriceDto,
} from '../dtos/compare-shopping-lists-response.dto';

interface CompareShoppingListsInput {
  ids: string[];
  userId: string;
}

@Injectable()
export class CompareShoppingListsUseCase implements UseCase<
  CompareShoppingListsInput,
  CompareShoppingListsResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(
    input: CompareShoppingListsInput,
  ): Promise<CompareShoppingListsResponseDto> {
    const lists = await this.shoppingListRepository.findByIdsAndUserId(
      input.ids,
      input.userId,
    );

    const priceMap = new Map<string, CompareItemListPriceDto[]>();

    for (const list of lists) {
      for (const item of list.items) {
        const key = item.productName.toLowerCase().trim();
        if (!priceMap.has(key)) {
          priceMap.set(key, []);
        }
        const priceDto = new CompareItemListPriceDto();
        priceDto.listId = list.id;
        priceDto.listName = list.name;
        priceDto.unitPriceLocal = item.unitPriceLocal;
        priceDto.unitPriceUsd = item.unitPriceUsd;
        priceMap.get(key)!.push(priceDto);
      }
    }

    const comparisons: CompareItemPriceDto[] = [];
    for (const [productName, prices] of priceMap) {
      if (prices.length < 2) continue;
      const dto = new CompareItemPriceDto();
      dto.productName = productName;
      dto.prices = prices;
      comparisons.push(dto);
    }

    const response = new CompareShoppingListsResponseDto();
    response.comparisons = comparisons;
    return response;
  }
}
