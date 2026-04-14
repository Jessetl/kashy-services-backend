import { DataSource } from 'typeorm';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
const hasDatabaseUrl = Boolean(databaseUrl);
const useSsl = process.env.DB_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  ...(hasDatabaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'kashydb',
      }),
  ...(hasDatabaseUrl
    ? {}
    : {
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        extra: useSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
      }),
  entities: ['src/**/*.orm-entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // Recuerda mantener esto en false en producción
});
