import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShoppingListOrmEntity } from './shopping-list.orm-entity';

@Entity('shopping_items')
export class ShoppingItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'list_id', type: 'uuid' })
  listId: string;

  @Column({ name: 'product_name', type: 'varchar' })
  productName: string;

  @Column({ name: 'category', type: 'varchar' })
  category: string;

  @Column({
    name: 'unit_price_local',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  unitPriceLocal: number;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({
    name: 'total_local',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalLocal: number;

  @Column({
    name: 'unit_price_usd',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  unitPriceUsd: number | null;

  @Column({
    name: 'total_usd',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  totalUsd: number | null;

  @Column({ name: 'is_purchased', type: 'boolean', default: false })
  isPurchased: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ShoppingListOrmEntity, (list) => list.items, {
    onDelete: 'CASCADE',
    nullable: false,
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'list_id' })
  shoppingList: ShoppingListOrmEntity;
}
