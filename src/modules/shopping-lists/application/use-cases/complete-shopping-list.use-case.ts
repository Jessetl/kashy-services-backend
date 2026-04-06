import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import type { IExchangeRateProvider } from '../../../exchange-rates/domain/interfaces/exchange-rate-provider.interface';
import { EXCHANGE_RATE_PROVIDER } from '../../../exchange-rates/domain/interfaces/exchange-rate-provider.interface';
import { ShoppingListNotFoundException } from '../../domain/exceptions/shopping-list-not-found.exception';
import { ShoppingListResponseDto } from '../dtos/shopping-list-response.dto';
import { ShoppingListMapper } from '../mappers/shopping-list.mapper';

interface CompleteShoppingListInput {
  listId: string;
  userId: string;
}

@Injectable()
export class CompleteShoppingListUseCase implements UseCase<
  CompleteShoppingListInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}

  async execute(
    input: CompleteShoppingListInput,
  ): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListRepository.findByIdAndUserId(
      input.listId,
      input.userId,
    );
    if (!list) throw new ShoppingListNotFoundException(input.listId);

    const exchangeRate = await this.exchangeRateProvider.getCurrent();
    const completedList = list.complete(exchangeRate.rateLocalPerUsd);

    const saved = await this.shoppingListRepository.save(completedList);
    return ShoppingListMapper.toResponse(saved);
  }
}
