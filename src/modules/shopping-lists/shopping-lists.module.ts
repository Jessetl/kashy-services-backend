import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListOrmEntity } from './infrastructure/persistence/orm-entities/shopping-list.orm-entity';
import { ShoppingItemOrmEntity } from './infrastructure/persistence/orm-entities/shopping-item.orm-entity';
import { TypeOrmShoppingListRepository } from './infrastructure/persistence/repositories/typeorm-shopping-list.repository';
import { SHOPPING_LIST_REPOSITORY } from './domain/interfaces/repositories/shopping-list.repository.interface';
import { CreateShoppingListUseCase } from './application/use-cases/create-shopping-list.use-case';
import { GetShoppingListsUseCase } from './application/use-cases/get-shopping-lists.use-case';
import { GetShoppingListByIdUseCase } from './application/use-cases/get-shopping-list-by-id.use-case';
import { UpdateShoppingListUseCase } from './application/use-cases/update-shopping-list.use-case';
import { DeleteShoppingListUseCase } from './application/use-cases/delete-shopping-list.use-case';
import { AddItemsToShoppingListUseCase } from './application/use-cases/add-items-to-shopping-list.use-case';
import { EditShoppingItemUseCase } from './application/use-cases/edit-shopping-item.use-case';
import { DeleteShoppingItemUseCase } from './application/use-cases/delete-shopping-item.use-case';
import { ToggleShoppingItemUseCase } from './application/use-cases/toggle-shopping-item.use-case';
import { CompleteShoppingListUseCase } from './application/use-cases/complete-shopping-list.use-case';
import { GetShoppingListHistoryUseCase } from './application/use-cases/get-shopping-list-history.use-case';
import { DuplicateShoppingListUseCase } from './application/use-cases/duplicate-shopping-list.use-case';
import { CompareShoppingListsUseCase } from './application/use-cases/compare-shopping-lists.use-case';
import { GetSpendingStatsUseCase } from './application/use-cases/get-spending-stats.use-case';
import { ShoppingListsController } from './infrastructure/controllers/shopping-lists.controller';
import { UsersModule } from '../users/users.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingListOrmEntity, ShoppingItemOrmEntity]),
    UsersModule,
    ExchangeRatesModule,
  ],
  controllers: [ShoppingListsController],
  providers: [
    {
      provide: SHOPPING_LIST_REPOSITORY,
      useClass: TypeOrmShoppingListRepository,
    },
    CreateShoppingListUseCase,
    GetShoppingListsUseCase,
    GetShoppingListByIdUseCase,
    UpdateShoppingListUseCase,
    DeleteShoppingListUseCase,
    AddItemsToShoppingListUseCase,
    EditShoppingItemUseCase,
    DeleteShoppingItemUseCase,
    ToggleShoppingItemUseCase,
    CompleteShoppingListUseCase,
    GetShoppingListHistoryUseCase,
    DuplicateShoppingListUseCase,
    CompareShoppingListsUseCase,
    GetSpendingStatsUseCase,
  ],
  exports: [SHOPPING_LIST_REPOSITORY],
})
export class ShoppingListsModule {}
