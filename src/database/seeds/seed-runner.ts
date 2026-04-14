/**
 * Runner de seeds
 *
 * COMANDOS:
 *   npm run seed              → ejecuta todos los seeds en orden
 *   npm run seed:clean        → revierte todos los seeds en orden inverso
 *   npm run seed -- --only 03 → ejecuta solo el seed que empiece con "03"
 *
 * ORDEN DE EJECUCIÓN (up):
 *   01-users → 02-notification-preferences → 03-debts → 04-notifications → 05-shopping-lists
 *
 * ORDEN DE REVERSIÓN (down):
 *   05-shopping-lists → 04-notifications → 03-debts → 02-notification-preferences → 01-users
 *   (aunque el CASCADE en FK del seed 01 borra todo de una vez)
 */

import 'dotenv/config';
import * as admin from 'firebase-admin';
import { DataSource, QueryRunner } from 'typeorm';
import { UsersSeed } from './01-users.seed';
import { NotificationPreferencesSeed } from './02-notification-preferences.seed';
import { DebtsSeed } from './03-debts.seed';
import { NotificationsSeed } from './04-notifications.seed';
import { ShoppingListsSeed } from './05-shopping-lists.seed';

// ─── Registro de seeds en orden ──────────────────────────────────────────────

const SEEDS = [
  { name: '01-users', seed: UsersSeed },
  { name: '02-notification-preferences', seed: NotificationPreferencesSeed },
  { name: '03-debts', seed: DebtsSeed },
  { name: '04-notifications', seed: NotificationsSeed },
  { name: '05-shopping-lists', seed: ShoppingListsSeed },
];

// ─── Firebase Admin ───────────────────────────────────────────────────────────

function initFirebase(): void {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Faltan variables de entorno de Firebase: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

// ─── DataSource ───────────────────────────────────────────────────────────────

const databaseUrl = process.env.DATABASE_URL;
const hasDatabaseUrl = Boolean(databaseUrl);
const useSsl = process.env.DB_SSL === 'true';

const dataSource = new DataSource({
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
      }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseArgs(): { clean: boolean; only?: string } {
  const args = process.argv.slice(2);
  const clean = args.includes('--clean');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx !== -1 ? args[onlyIdx + 1] : undefined;
  return { clean, only };
}

async function run(
  q: QueryRunner,
  seeds: typeof SEEDS,
  direction: 'up' | 'down',
): Promise<void> {
  const ordered = direction === 'down' ? [...seeds].reverse() : seeds;

  for (const { name, seed } of ordered) {
    try {
      await seed[direction](q);
      console.log(`  ✓ [${direction.toUpperCase()}] ${name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ [${direction.toUpperCase()}] ${name}: ${msg}`);
      throw err;
    }
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { clean, only } = parseArgs();
  const direction: 'up' | 'down' = clean ? 'down' : 'up';

  const seeds = only
    ? SEEDS.filter(({ name }) => name.startsWith(only))
    : SEEDS;

  if (seeds.length === 0) {
    console.error(`No se encontró ningún seed que empiece con "${only}"`);
    process.exit(1);
  }

  console.log(
    `\n━━━ Seeds [${direction.toUpperCase()}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  );
  if (only) console.log(`  Filtro: --only ${only}`);

  initFirebase();

  await dataSource.initialize();
  const q = dataSource.createQueryRunner();
  await q.connect();
  await q.startTransaction();

  try {
    await run(q, seeds, direction);
    await q.commitTransaction();
    console.log(`━━━ Completado ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch {
    await q.rollbackTransaction();
    console.error(`\n  → Transacción revertida\n`);
    process.exit(1);
  } finally {
    await q.release();
    await dataSource.destroy();
    await admin.app().delete();
  }
}

void main();
