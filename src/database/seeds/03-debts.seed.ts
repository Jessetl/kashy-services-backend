import { QueryRunner } from 'typeorm';
import { USER_IDS, DEBT_IDS } from './seed-ids';

/** Retorna una fecha a N días desde hoy en formato YYYY-MM-DD */
function dateOnly(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

export const DebtsSeed = {
  async up(q: QueryRunner): Promise<void> {
    // ── Usuario Juan ─────────────────────────────────────────────────────────
    await q.query(`
      INSERT INTO debts (
        id, user_id, title, description,
        amount_usd, priority,
        interest_rate_pct, interest_amount_usd,
        due_date, is_paid, is_collection, created_at
      ) VALUES

        -- Deuda alta prioridad, vence MAÑANA → notificación debe dispararse ya
        (
          '${DEBT_IDS.deudaCarlos}',
          '${USER_IDS.juan}',
          'Préstamo de Carlos',
          'Préstamo de emergencia del mes pasado, acordado con Carlos',
          150.00, 'HIGH',
          0, 0,
          '${dateOnly(1)}', false, false, now()
        ),

        -- Deuda media prioridad, vence en 5 días
        (
          '${DEBT_IDS.deudaBanco}',
          '${USER_IDS.juan}',
          'Cuota préstamo banco',
          'Cuota mensual del préstamo personal',
          320.00, 'MEDIUM',
          0, 0,
          '${dateOnly(5)}', false, false, now()
        ),

        -- Deuda baja prioridad, sin fecha de vencimiento → NO genera notificación
        (
          '${DEBT_IDS.deudaNetflix}',
          '${USER_IDS.juan}',
          'Netflix compartido con familia',
          NULL,
          5.99, 'LOW',
          0, 0,
          NULL, false, false, now()
        ),

        -- Cobro alta prioridad, vence MAÑANA → notificación debe dispararse ya
        (
          '${DEBT_IDS.cobroPedro}',
          '${USER_IDS.juan}',
          'Cobro cena a Pedro',
          'Cena del viernes en el restaurante La Tasca, Pedro debe su parte',
          42.50, 'HIGH',
          0, 0,
          '${dateOnly(1)}', false, true, now()
        ),

        -- Deuda ya pagada → NO genera notificación aunque tenga fecha pasada
        (
          '${DEBT_IDS.deudaPagada}',
          '${USER_IDS.juan}',
          'Teléfono de febrero (pagado)',
          'Cuota del plan de telefonía de febrero',
          25.00, 'LOW',
          0, 0,
          '${dateOnly(-5)}', true, false, now()
        )

      ON CONFLICT (id) DO NOTHING
    `);

    // ── Usuario María ─────────────────────────────────────────────────────────
    await q.query(`
      INSERT INTO debts (
        id, user_id, title, description,
        amount_usd, priority,
        interest_rate_pct, interest_amount_usd,
        due_date, is_paid, is_collection, created_at
      ) VALUES

        -- Deuda alta prioridad con interés, vence MAÑANA → notificación ya disparable
        (
          '${DEBT_IDS.deudaLuis}',
          '${USER_IDS.maria}',
          'Préstamo a Luis con interés',
          'Préstamo con acuerdo de 10% mensual, registrado el mes pasado',
          500.00, 'HIGH',
          10.0, 50.00,
          '${dateOnly(1)}', false, false, now()
        ),

        -- Cobro media prioridad, vence en 2 días
        (
          '${DEBT_IDS.cobroAna}',
          '${USER_IDS.maria}',
          'Cobro alquiler a Ana',
          'Parte del alquiler compartido de este mes',
          180.00, 'MEDIUM',
          0, 0,
          '${dateOnly(2)}', false, true, now()
        ),

        -- Cobro alta prioridad, vence en 4 días
        (
          '${DEBT_IDS.cobroJose}',
          '${USER_IDS.maria}',
          'Cobro materiales a José',
          'Materiales de construcción que José usó y prometió pagar',
          275.00, 'HIGH',
          0, 0,
          '${dateOnly(4)}', false, true, now()
        )

      ON CONFLICT (id) DO NOTHING
    `);
  },

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DELETE FROM debts
      WHERE id IN (
        '${DEBT_IDS.deudaCarlos}',
        '${DEBT_IDS.deudaBanco}',
        '${DEBT_IDS.deudaNetflix}',
        '${DEBT_IDS.cobroPedro}',
        '${DEBT_IDS.deudaPagada}',
        '${DEBT_IDS.deudaLuis}',
        '${DEBT_IDS.cobroAna}',
        '${DEBT_IDS.cobroJose}'
      )
    `);
  },
};
