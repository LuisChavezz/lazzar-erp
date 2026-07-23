// Funciones puras de derivación para los KPIs del listado de Picking. Operan
// sobre `Picking[]` ya cargado por `usePickings()` — sin fetch propio, mismo
// espíritu que `computeCxcKpis` (accounts-receivable).

import type { Picking } from "../interfaces/picking.interface";
import type { PickingPrioridad } from "../interfaces/picking.interface";

export interface PickingKpis {
  /** Conteo simple del listado cargado. */
  totalPickings: number;
  /**
   * Suma de líneas AÚN NO surtidas (`total_lineas - total_lineas_completas`)
   * a través de todos los pickings — representa trabajo pendiente real, no el
   * total bruto de líneas (que incluiría lo ya completado). Cada término se
   * acota a `>= 0` por si algún registro llegara con `total_lineas_completas`
   * mayor a `total_lineas` (dato inconsistente del backend): un valor así
   * jamás debe restar al total en vez de sumar.
   */
  lineasPorSurtir: number;
  /** Conteo de pickings por `prioridad`. */
  prioridadBreakdown: Record<PickingPrioridad, number>;
}

export const computePickingKpis = (pickings: Picking[]): PickingKpis => {
  let lineasPorSurtir = 0;
  const prioridadBreakdown: Record<PickingPrioridad, number> = {
    BAJA: 0,
    MEDIA: 0,
    ALTA: 0,
  };

  for (const picking of pickings) {
    lineasPorSurtir += Math.max(0, picking.total_lineas - picking.total_lineas_completas);

    // `prioridad` se tipa como `string` en `Picking` (el listado no restringe
    // el enum, ver `picking.interface.ts`) — se descarta silenciosamente
    // cualquier valor fuera de los 3 documentados en vez de que rompa el
    // conteo, igual que `StatusBadge` degrada ante un `estado` desconocido.
    if (picking.prioridad in prioridadBreakdown) {
      prioridadBreakdown[picking.prioridad as PickingPrioridad] += 1;
    }
  }

  return {
    totalPickings: pickings.length,
    lineasPorSurtir,
    prioridadBreakdown,
  };
};
