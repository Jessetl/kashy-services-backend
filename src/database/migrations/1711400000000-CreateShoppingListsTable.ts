import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateShoppingListsTable1711400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- shopping_lists ---
    await queryRunner.createTable(
      new Table({
        name: 'shopping_lists',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'store_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'COMPLETED'],
            default: `'ACTIVE'`,
          },
          {
            name: 'iva_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'total_local',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_usd',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'exchange_rate_snapshot',
            type: 'decimal',
            precision: 18,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'completed_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'shopping_lists',
      new TableForeignKey({
        name: 'FK_shopping_lists_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('shopping_lists');
  }
}
