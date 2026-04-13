import { QueryRunner } from 'typeorm';
import { USER_IDS, DEBT_IDS, NOTIFICATION_IDS } from './seed-ids';

/**
 * scheduled_at = due_date - 24h
 * Si due_date es mañana, scheduled_at = ahora aprox → el cron lo dispara en el próximo ciclo.
 * Si due_date es en N días, scheduled_at = N-1 días desde ahora.
 */
function scheduledAt(daysUntilDue: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysUntilDue - 1); // due_date - 24h
  return d.toISOString();
}

export const NotificationsSeed = {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      INSERT INTO notifications (
        id, user_id, debt_id, type, scheduled_at, sent_at, status
      ) VALUES

        -- Juan: "Préstamo de Carlos" vence mañana → scheduled_at ≈ ahora → DISPARA YA
        (
          '${NOTIFICATION_IDS.juanDeudaCarlos}',
          '${USER_IDS.juan}',
          '${DEBT_IDS.deudaCarlos}',
          'debt_due_reminder',
          '${scheduledAt(1)}',
          NULL, 'PENDING'
        ),

        -- Juan: "Cobro cena a Pedro" vence mañana → scheduled_at ≈ ahora → DISPARA YA
        (
          '${NOTIFICATION_IDS.juanCobroPedro}',
          '${USER_IDS.juan}',
          '${DEBT_IDS.cobroPedro}',
          'debt_due_reminder',
          '${scheduledAt(1)}',
          NULL, 'PENDING'
        ),

        -- María: "Préstamo a Luis" vence mañana → scheduled_at ≈ ahora → DISPARA YA
        (
          '${NOTIFICATION_IDS.mariaDeudaLuis}',
          '${USER_IDS.maria}',
          '${DEBT_IDS.deudaLuis}',
          'debt_due_reminder',
          '${scheduledAt(1)}',
          NULL, 'PENDING'
        ),

        -- Juan: "Cuota préstamo banco" vence en 5 días → scheduled_at = en 4 días → no dispara aún
        (
          '${NOTIFICATION_IDS.juanDeudaBanco}',
          '${USER_IDS.juan}',
          '${DEBT_IDS.deudaBanco}',
          'debt_due_reminder',
          '${scheduledAt(5)}',
          NULL, 'PENDING'
        ),

        -- María: "Cobro alquiler a Ana" vence en 2 días → scheduled_at = en 1 día → no dispara aún
        (
          '${NOTIFICATION_IDS.mariaCobroAna}',
          '${USER_IDS.maria}',
          '${DEBT_IDS.cobroAna}',
          'debt_due_reminder',
          '${scheduledAt(2)}',
          NULL, 'PENDING'
        )

      ON CONFLICT (id) DO NOTHING
    `);
  },

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DELETE FROM notifications
      WHERE id IN (
        '${NOTIFICATION_IDS.juanDeudaCarlos}',
        '${NOTIFICATION_IDS.juanCobroPedro}',
        '${NOTIFICATION_IDS.mariaDeudaLuis}',
        '${NOTIFICATION_IDS.juanDeudaBanco}',
        '${NOTIFICATION_IDS.mariaCobroAna}'
      )
    `);
  },
};
