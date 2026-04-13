/**
 * Respuesta común de dolarapi.com para todos los países soportados.
 * Los campos `compra`, `venta` y `promedio` varían por endpoint/país.
 */
export interface DolarApiResponse {
  moneda: string;
  fuente: string;
  nombre?: string;
  compra: number | null;
  venta: number | null;
  promedio: number | null;
  fechaActualizacion: string;
}
