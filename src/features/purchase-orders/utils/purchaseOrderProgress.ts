import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

export interface PurchaseOrderProgress {
  recibidas: number;
  solicitadas: number;
  /** 0–100, tal como lo calcula el backend. */
  pct: number;
}

/**
 * Progreso de recepción de una OC, leído de lo que calcula el backend
 * (`piezas_recibidas`, `progreso_pct`). No se recalcula aquí: el backend
 * excluye las recepciones canceladas. `null` si la respuesta aún no trae los
 * campos, para no pintar un 0 % que no es cierto.
 */
export const getPurchaseOrderProgress = (
  order: Pick<PurchaseOrder, "total_piezas" | "piezas_recibidas" | "progreso_pct">,
): PurchaseOrderProgress | null => {
  if (order.piezas_recibidas == null || order.progreso_pct == null) return null;
  const recibidas = Number(order.piezas_recibidas);
  if (Number.isNaN(recibidas)) return null;
  const pct = Math.max(0, Math.min(100, Math.round(order.progreso_pct)));
  return { recibidas, solicitadas: order.total_piezas, pct };
};

/** Color de la barra: verde completa, azul en curso. */
export const progressBarClass = (pct: number) => (pct >= 100 ? "bg-emerald-500" : "bg-sky-500");
