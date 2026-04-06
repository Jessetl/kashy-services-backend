import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateShoppingItemsTable1711500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'shopping_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'list_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'product_name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'unit_price_local',
            type: 'decimal',
            precision: 18,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'integer',
            default: 1,
          },
          {
            name: 'total_local',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'unit_price_usd',
            type: 'decimal',
            precision: 18,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'total_usd',
            type: 'decimal',
            precision: 18,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'is_purchased',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'shopping_items',
      new TableForeignKey({
        name: 'FK_shopping_items_list',
        columnNames: ['list_id'],
        referencedTableName: 'shopping_lists',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('shopping_items');
  }
}
