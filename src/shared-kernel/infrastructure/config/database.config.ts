import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres' as const,
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'postgres'),
  database: configService.get<string>('DB_DATABASE', 'db'),
  ssl:
    configService.get<string>('DB_SSL') === 'true'
      ? { rejectUnauthorized: false }
      : false,
  autoLoadEntities: true,
  synchronize: false,
  logging: configService.get<string>('DB_LOGGING') === 'true',
  migrations: ['dist/database/migrations/*.js'],
  migrationsRun: false,
});
