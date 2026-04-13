import { QueryRunner } from 'typeorm';
import * as admin from 'firebase-admin';
import { USER_IDS } from './seed-ids';

const SEED_USERS = [
  {
    id: USER_IDS.juan,
    email: 'seed-juan@kashy.test',
    password: 'kashy1234',
    firstName: 'Juan',
    lastName: 'Pérez',
    country: 'VE',
    fcmToken:
      'cFake_FCM_Token_Juan_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  {
    id: USER_IDS.maria,
    email: 'seed-maria@kashy.test',
    password: 'kashy1234',
    firstName: 'María',
    lastName: 'González',
    country: 'VE',
    fcmToken:
      'cFake_FCM_Token_Maria_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
];

async function upsertFirebaseUser(
  auth: admin.auth.Auth,
  email: string,
  password: string,
  displayName: string,
): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email, password, displayName });
    return created.uid;
  }
}

export const UsersSeed = {
  async up(q: QueryRunner): Promise<void> {
    const auth = admin.app().auth();

    for (const u of SEED_USERS) {
      const firebaseUid = await upsertFirebaseUser(
        auth,
        u.email,
        u.password,
        `${u.firstName} ${u.lastName}`,
      );

      await q.query(
        `
        INSERT INTO users (
          id, firebase_uid, email,
          first_name, last_name,
          country, notification_enabled, fcm_token,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, now(), now())
        ON CONFLICT (id) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid
        `,
        [
          u.id,
          firebaseUid,
          u.email,
          u.firstName,
          u.lastName,
          u.country,
          u.fcmToken,
        ],
      );
    }
  },

  async down(q: QueryRunner): Promise<void> {
    const auth = admin.app().auth();

    await q.query(`DELETE FROM users WHERE id IN ($1, $2)`, [
      USER_IDS.juan,
      USER_IDS.maria,
    ]);

    for (const u of SEED_USERS) {
      try {
        const fbUser = await auth.getUserByEmail(u.email);
        await auth.deleteUser(fbUser.uid);
      } catch {
        // Ya no existe en Firebase, ignorar
      }
    }
  },
};
