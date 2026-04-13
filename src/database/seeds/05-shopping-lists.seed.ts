import { QueryRunner } from 'typeorm';
import { USER_IDS, LIST_IDS, ITEM_IDS } from './seed-ids';

export const ShoppingListsSeed = {
  async up(q: QueryRunner): Promise<void> {
    // ── Listas ───────────────────────────────────────────────────────────────
    await q.query(`
      INSERT INTO shopping_lists (
        id, user_id, name, store_name, status,
        iva_enabled, total_local, total_usd,
        exchange_rate_snapshot, created_at, completed_at
      ) VALUES

        -- Juan: lista ACTIVE en progreso (editable)
        (
          '${LIST_IDS.listaActiva}',
          '${USER_IDS.juan}',
          'Mercado semanal',
          'Central Madeirense',
          'ACTIVE',
          false, 0, 0,
          NULL,
          now() - interval '1 hour',
          NULL
        ),

        -- Juan: lista COMPLETED del mes pasado (historial)
        (
          '${LIST_IDS.listaCompletada1}',
          '${USER_IDS.juan}',
          'Compra de la semana pasada',
          'Bicentenario',
          'COMPLETED',
          false, 142000.00, 3.98,
          35680.0000,
          now() - interval '8 days',
          now() - interval '7 days'
        ),

        -- Juan: lista COMPLETED de hace 2 semanas (historial, con IVA)
        (
          '${LIST_IDS.listaCompletada2}',
          '${USER_IDS.juan}',
          'Carne y verduras',
          'El Bodegón',
          'COMPLETED',
          true, 280000.00, 7.74,
          36180.0000,
          now() - interval '15 days',
          now() - interval '14 days'
        ),

        -- María: lista ACTIVE en progreso
        (
          '${LIST_IDS.listaActivaMaria}',
          '${USER_IDS.maria}',
          'Cuidado personal',
          'Farmatodo',
          'ACTIVE',
          false, 0, 0,
          NULL,
          now() - interval '30 minutes',
          NULL
        ),

        -- María: lista COMPLETED (historial)
        (
          '${LIST_IDS.listaCompletadaM}',
          '${USER_IDS.maria}',
          'Despensa del mes',
          'Día a Día',
          'COMPLETED',
          false, 510000.00, 14.10,
          36170.0000,
          now() - interval '5 days',
          now() - interval '4 days'
        )

      ON CONFLICT (id) DO NOTHING
    `);

    // ── Items ────────────────────────────────────────────────────────────────

    // Lista activa de Juan (algunos comprados, otros no)
    await q.query(`
      INSERT INTO shopping_items (
        id, list_id, product_name, category,
        unit_price_local, quantity, total_local,
        unit_price_usd, total_usd,
        is_purchased, created_at
      ) VALUES
        ('${ITEM_IDS.leche}',  '${LIST_IDS.listaActiva}', 'Leche completa 1L',   'Lácteos',   8500.00,  3, 25500.00, 0.2382, 0.7147, true,  now()),
        ('${ITEM_IDS.pan}',   '${LIST_IDS.listaActiva}', 'Pan de sándwich',      'Panadería', 6200.00,  2, 12400.00, 0.1736, 0.3472, true,  now()),
        ('${ITEM_IDS.pollo}', '${LIST_IDS.listaActiva}', 'Pechuga de pollo 1kg', 'Carnes',   45000.00,  1, 45000.00, 1.2599, 1.2599, false, now()),
        ('${ITEM_IDS.arroz}', '${LIST_IDS.listaActiva}', 'Arroz diana 1kg',      'Granos',   12000.00,  2, 24000.00, 0.3362, 0.6724, false, now()),
        ('${ITEM_IDS.aceite}','${LIST_IDS.listaActiva}', 'Aceite vegetal 1L',    'Aceites',  18500.00,  1, 18500.00, 0.5185, 0.5185, false, now())
      ON CONFLICT (id) DO NOTHING
    `);

    // Lista completada 1 de Juan
    await q.query(`
      INSERT INTO shopping_items (
        id, list_id, product_name, category,
        unit_price_local, quantity, total_local,
        unit_price_usd, total_usd,
        is_purchased, created_at
      ) VALUES
        ('${ITEM_IDS.pasta}',    '${LIST_IDS.listaCompletada1}', 'Pasta espagueti 500g', 'Pastas',   5800.00, 3, 17400.00, 0.1626, 0.4877, true, now() - interval '7 days'),
        ('${ITEM_IDS.atun}',     '${LIST_IDS.listaCompletada1}', 'Atún en lata 140g',    'Enlatados',7200.00, 4, 28800.00, 0.2019, 0.8076, true, now() - interval '7 days'),
        ('${ITEM_IDS.mayonesa}', '${LIST_IDS.listaCompletada1}', 'Mayonesa 445g',        'Salsas',  14500.00, 2, 29000.00, 0.4065, 0.8130, true, now() - interval '7 days')
      ON CONFLICT (id) DO NOTHING
    `);

    // Lista completada 2 de Juan (con IVA)
    await q.query(`
      INSERT INTO shopping_items (
        id, list_id, product_name, category,
        unit_price_local, quantity, total_local,
        unit_price_usd, total_usd,
        is_purchased, created_at
      ) VALUES
        ('${ITEM_IDS.carne}',  '${LIST_IDS.listaCompletada2}', 'Carne molida 1kg', 'Carnes',    85000.00, 1, 85000.00, 2.3491, 2.3491, true, now() - interval '14 days'),
        ('${ITEM_IDS.papa}',   '${LIST_IDS.listaCompletada2}', 'Papa blanca 1kg',  'Vegetales',  9500.00, 3, 28500.00, 0.2626, 0.7878, true, now() - interval '14 days'),
        ('${ITEM_IDS.tomate}', '${LIST_IDS.listaCompletada2}', 'Tomate 1kg',       'Vegetales', 11000.00, 2, 22000.00, 0.3040, 0.6080, true, now() - interval '14 days')
      ON CONFLICT (id) DO NOTHING
    `);

    // Lista activa de María
    await q.query(`
      INSERT INTO shopping_items (
        id, list_id, product_name, category,
        unit_price_local, quantity, total_local,
        unit_price_usd, total_usd,
        is_purchased, created_at
      ) VALUES
        ('${ITEM_IDS.shampoo}', '${LIST_IDS.listaActivaMaria}', 'Shampoo Pantene 400ml', 'Higiene', 28000.00, 1, 28000.00, 0.7744, 0.7744, false, now()),
        ('${ITEM_IDS.jabon}',   '${LIST_IDS.listaActivaMaria}', 'Jabón Palmolive x3',   'Higiene',  9500.00, 2, 19000.00, 0.2626, 0.5253, true,  now())
      ON CONFLICT (id) DO NOTHING
    `);

    // Lista completada de María
    await q.query(`
      INSERT INTO shopping_items (
        id, list_id, product_name, category,
        unit_price_local, quantity, total_local,
        unit_price_usd, total_usd,
        is_purchased, created_at
      ) VALUES
        ('${ITEM_IDS.cafe}',   '${LIST_IDS.listaCompletadaM}', 'Café molido 250g',     'Bebidas',  18000.00, 2, 36000.00, 0.4977, 0.9953, true, now() - interval '4 days'),
        ('${ITEM_IDS.azucar}', '${LIST_IDS.listaCompletadaM}', 'Azúcar refinada 1kg',  'Granos',    8500.00, 4, 34000.00, 0.2349, 0.9397, true, now() - interval '4 days'),
        ('${ITEM_IDS.harina}', '${LIST_IDS.listaCompletadaM}', 'Harina de maíz 1kg',   'Granos',    7200.00, 5, 36000.00, 0.1990, 0.9950, true, now() - interval '4 days')
      ON CONFLICT (id) DO NOTHING
    `);

    // Actualizar totales de las listas ACTIVE con los ítems insertados
    await q.query(`
      UPDATE shopping_lists SET
        total_local = (
          SELECT COALESCE(SUM(total_local), 0)
          FROM shopping_items
          WHERE list_id = shopping_lists.id
        ),
        total_usd = (
          SELECT COALESCE(SUM(total_usd), 0)
          FROM shopping_items
          WHERE list_id = shopping_lists.id
        )
      WHERE id IN ('${LIST_IDS.listaActiva}', '${LIST_IDS.listaActivaMaria}')
    `);
  },

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DELETE FROM shopping_lists
      WHERE id IN (
        '${LIST_IDS.listaActiva}',
        '${LIST_IDS.listaCompletada1}',
        '${LIST_IDS.listaCompletada2}',
        '${LIST_IDS.listaActivaMaria}',
        '${LIST_IDS.listaCompletadaM}'
      )
    `);
    // Los items se eliminan por CASCADE desde shopping_lists
  },
};
