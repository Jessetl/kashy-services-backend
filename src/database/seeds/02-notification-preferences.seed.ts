import { QueryRunner } from 'typeorm';
import { USER_IDS, PREF_IDS } from './seed-ids';

export const NotificationPreferencesSeed = {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      INSERT INTO notification_preferences (
        id, user_id,
        push_enabled, debt_reminders, price_alerts, list_reminders,
        updated_at
      ) VALUES
        -- Juan: todo activado → recibirá notificaciones de deudas
        (
          '${PREF_IDS.juan}',
          '${USER_IDS.juan}',
          true, true, false, true,
          now()
        ),
        -- Maria: push activo, debt_reminders activo → también recibirá notificaciones
        (
          '${PREF_IDS.maria}',
          '${USER_IDS.maria}',
          true, true, true, false,
          now()
        )
      ON CONFLICT (id) DO NOTHING
    `);
  },

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DELETE FROM notification_preferences
      WHERE id IN ('${PREF_IDS.juan}', '${PREF_IDS.maria}')
    `);
  },
};
