import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

type DatabaseUrlConfig = { url: string };

type DatabaseConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

type DatabaseConnectionConfig = DatabaseUrlConfig | DatabaseConfig;

type DatabaseSslConfig = {
  ssl: { rejectUnauthorized: false } | false;
  extra: { ssl: { rejectUnauthorized: false } } | undefined;
};

const getConnectionConfig = (
  configService: ConfigService,
  databaseUrl?: string,
): DatabaseConnectionConfig => {
  if (databaseUrl) {
    return { url: databaseUrl };
  }

  return {
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'kashydb'),
  };
};

const getSslConfig = (
  hasDatabaseUrl: boolean,
  useSsl: boolean,
): Partial<DatabaseSslConfig> => {
  if (hasDatabaseUrl) {
    return {};
  }

  return {
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    extra: useSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
  };
};

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const useSsl = configService.get<string>('DB_SSL') === 'true';
  const connectionConfig = getConnectionConfig(configService, databaseUrl);
  const sslConfig = getSslConfig(Boolean(databaseUrl), useSsl);

  return {
    type: 'postgres',
    ...connectionConfig,
    ...sslConfig,
    autoLoadEntities: true,
    synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
    migrations: ['dist/database/migrations/*.js'],
  };
};
