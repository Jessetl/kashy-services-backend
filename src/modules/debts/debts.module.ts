import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtOrmEntity } from './infrastructure/persistence/orm-entities/debt.orm-entity';
import { TypeOrmDebtRepository } from './infrastructure/persistence/repositories/typeorm-debt.repository';
import { DEBT_REPOSITORY } from './domain/interfaces/repositories/debt.repository.interface';
import { CreateDebtUseCase } from './application/use-cases/create-debt.use-case';
import { GetDebtsUseCase } from './application/use-cases/get-debts.use-case';
import { GetDebtByIdUseCase } from './application/use-cases/get-debt-by-id.use-case';
import { UpdateDebtUseCase } from './application/use-cases/update-debt.use-case';
import { DeleteDebtUseCase } from './application/use-cases/delete-debt.use-case';
import { PayDebtUseCase } from './application/use-cases/pay-debt.use-case';
import { DebtsController } from './infrastructure/controllers/debts.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DebtOrmEntity]),
    forwardRef(() => UsersModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [DebtsController],
  providers: [
    {
      provide: DEBT_REPOSITORY,
      useClass: TypeOrmDebtRepository,
    },
    CreateDebtUseCase,
    GetDebtsUseCase,
    GetDebtByIdUseCase,
    UpdateDebtUseCase,
    DeleteDebtUseCase,
    PayDebtUseCase,
  ],
  exports: [DEBT_REPOSITORY],
})
export class DebtsModule {}
