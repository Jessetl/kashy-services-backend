import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IShoppingListRepository } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import { SHOPPING_LIST_REPOSITORY } from '../../domain/interfaces/repositories/shopping-list.repository.interface';
import {
  SpendingStatsResponseDto,
  SpendingStatDto,
} from '../dtos/spending-stats-response.dto';

interface GetSpendingStatsInput {
  userId: string;
  period: 'week' | 'month';
}

@Injectable()
export class GetSpendingStatsUseCase
  implements UseCase<GetSpendingStatsInput, SpendingStatsResponseDto>
{
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(
    input: GetSpendingStatsInput,
  ): Promise<SpendingStatsResponseDto> {
    const rows = await this.shoppingListRepository.getSpendingStats(
      input.userId,
      input.period,
    );

    const response = new SpendingStatsResponseDto();
    response.period = input.period;
    response.stats = rows.map((row) => {
      const stat = new SpendingStatDto();
      stat.period = row.period;
      stat.totalVes = row.totalVes;
      stat.totalUsd = row.totalUsd;
      stat.listCount = row.listCount;
      return stat;
    });

    return response;
  }
}
