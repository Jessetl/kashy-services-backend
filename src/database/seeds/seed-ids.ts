/**
 * IDs fijos compartidos entre todos los seeds.
 * Permiten ejecutar cada seed por separado y limpiarlos de forma predecible.
 */

// ─── Usuarios ────────────────────────────────────────────────────────────────
export const USER_IDS = {
  juan: 'a1000000-5eed-0000-0000-000000000001',
  maria: 'a1000000-5eed-0000-0000-000000000002',
} as const;

// ─── Notification preferences ─────────────────────────────────────────────────
export const PREF_IDS = {
  juan: 'b2000000-5eed-0000-0000-000000000001',
  maria: 'b2000000-5eed-0000-0000-000000000002',
} as const;

// ─── Deudas / Cobros ─────────────────────────────────────────────────────────
export const DEBT_IDS = {
  // Usuario Juan
  deudaCarlos: 'c3000000-5eed-0000-0000-000000000001', // deuda, vence mañana
  deudaBanco: 'c3000000-5eed-0000-0000-000000000002', // deuda, vence en 5 días
  deudaNetflix: 'c3000000-5eed-0000-0000-000000000003', // deuda, sin fecha
  cobroPedro: 'c3000000-5eed-0000-0000-000000000004', // cobro, vence mañana
  deudaPagada: 'c3000000-5eed-0000-0000-000000000005', // deuda ya pagada
  // Usuario Maria
  deudaLuis: 'c3000000-5eed-0000-0000-000000000006', // deuda con interés, vence mañana
  cobroAna: 'c3000000-5eed-0000-0000-000000000007', // cobro, vence en 2 días
  cobroJose: 'c3000000-5eed-0000-0000-000000000008', // cobro alta prioridad, vence en 4 días
} as const;

// ─── Notificaciones ───────────────────────────────────────────────────────────
export const NOTIFICATION_IDS = {
  // Scheduled_at ya pasado → se disparan en el próximo ciclo del cron
  juanDeudaCarlos: 'd4000000-5eed-0000-0000-000000000001',
  juanCobroPedro: 'd4000000-5eed-0000-0000-000000000002',
  mariaDeudaLuis: 'd4000000-5eed-0000-0000-000000000003',
  // Scheduled_at en el futuro → no se disparan todavía
  juanDeudaBanco: 'd4000000-5eed-0000-0000-000000000004',
  mariaCobroAna: 'd4000000-5eed-0000-0000-000000000005',
} as const;

// ─── Shopping lists ───────────────────────────────────────────────────────────
export const LIST_IDS = {
  // Usuario Juan
  listaActiva: 'e5000000-5eed-0000-0000-000000000001', // ACTIVE, en progreso
  listaCompletada1: 'e5000000-5eed-0000-0000-000000000002', // COMPLETED, historial
  listaCompletada2: 'e5000000-5eed-0000-0000-000000000003', // COMPLETED, historial
  // Usuario Maria
  listaActivaMaria: 'e5000000-5eed-0000-0000-000000000004', // ACTIVE
  listaCompletadaM: 'e5000000-5eed-0000-0000-000000000005', // COMPLETED
} as const;

// ─── Shopping items ───────────────────────────────────────────────────────────
export const ITEM_IDS = {
  // listaActiva (Juan)
  leche: 'f6000000-5eed-0000-0000-000000000001',
  pan: 'f6000000-5eed-0000-0000-000000000002',
  pollo: 'f6000000-5eed-0000-0000-000000000003',
  arroz: 'f6000000-5eed-0000-0000-000000000004',
  aceite: 'f6000000-5eed-0000-0000-000000000005',
  // listaCompletada1 (Juan)
  pasta: 'f6000000-5eed-0000-0000-000000000006',
  atun: 'f6000000-5eed-0000-0000-000000000007',
  mayonesa: 'f6000000-5eed-0000-0000-000000000008',
  // listaCompletada2 (Juan)
  carne: 'f6000000-5eed-0000-0000-000000000009',
  papa: 'f6000000-5eed-0000-0000-000000000010',
  tomate: 'f6000000-5eed-0000-0000-000000000011',
  // listaActivaMaria
  shampoo: 'f6000000-5eed-0000-0000-000000000012',
  jabon: 'f6000000-5eed-0000-0000-000000000013',
  // listaCompletadaM (Maria)
  cafe: 'f6000000-5eed-0000-0000-000000000014',
  azucar: 'f6000000-5eed-0000-0000-000000000015',
  harina: 'f6000000-5eed-0000-0000-000000000016',
} as const;
