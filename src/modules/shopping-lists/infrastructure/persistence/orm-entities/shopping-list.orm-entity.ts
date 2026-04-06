import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../../users/infrastructure/persistence/orm-entities/user.orm-entity';
import { ShoppingItemOrmEntity } from './shopping-item.orm-entity';
import { ShoppingListStatus } from '../../../domain/enums/shopping-list-status.enum';

@Entity('shopping_lists')
export class ShoppingListOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'store_name', type: 'varchar', nullable: true })
  storeName: string | null;

  @Column({
    type: 'enum',
    enum: ShoppingListStatus,
    default: ShoppingListStatus.ACTIVE,
  })
  status: ShoppingListStatus;

  @Column({ name: 'iva_enabled', type: 'boolean', default: false })
  ivaEnabled: boolean;

  @Column({
    name: 'total_local',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalLocal: number;

  @Column({
    name: 'total_usd',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalUsd: number;

  @Column({
    name: 'exchange_rate_snapshot',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  exchangeRateSnapshot: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserOrmEntity;

  @OneToMany(() => ShoppingItemOrmEntity, (item) => item.shoppingList, {
    cascade: true,
    eager: true,
    orphanedRowAction: 'delete',
  })
  items: ShoppingItemOrmEntity[];
}
