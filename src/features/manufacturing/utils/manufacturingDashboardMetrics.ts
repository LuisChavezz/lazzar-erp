import type { ProductionOrderListItem } from "@/src/features/production-orders/interfaces/production-order.interface";
import type {
  EmbroideryOrder,
  EmbroideryOrderStatus,
} from "@/src/features/embroidery/interfaces/embroidery.interface";

/**
 * Métricas del dashboard de Manufactura, como funciones puras sobre los
 * listados reales:
 *  - OP: `GET /produccion/orden-produccion/` (`ProductionOrderListItem`,
 *    `estatus_op` 1-7: 1 Pendiente, 2 Preparación, 3 En producción,
 *    4 Revisión, 5 Completado, 6 Detenido, 7 Cancelado).
 *  - OB: `GET /produccion/orden-bordado/` (`estatus_bordado` 1-8: 1-6 en
 *    curso o detenidas, 7 Finalizado, 8 Cancelado legacy).
 *
 * Ningún listado está paginado (el backend no define paginación), así que los
 * conteos por `.length` son totales reales.
 */

// ── Órdenes de producción ─────────────────────────────────────────────────────

const OP_IN_PRODUCTION = 3;
const OP_COMPLETED = 5;
const OP_STOPPED = 6;
const OP_CANCELLED = 7;
/** En curso o detenidas: todo lo que no está completado ni cancelado. */
const OP_ACTIVE: ReadonlySet<number> = new Set([1, 2, 3, 4, OP_STOPPED]);

export interface ProductionOrderMetrics {
  /** Todas las OPs, canceladas incluidas: base de las distribuciones. */
  all: number;
  /** Sin canceladas: lo que suma a la tarjeta del módulo y a los totales. */
  counted: number;
  active: number;
  inProduction: number;
  completed: number;
  /** Detenidas (estatus 6): son las "alertas" del dashboard. */
  stopped: ProductionOrderListItem[];
  /** Conteo por `estatus_op`, ascendente; suma `all`. */
  byStatus: Array<{ estatus: number; display: string; count: number }>;
  /** Conteo por `prioridad` (1 Alta, 2 Media, 3 Baja) sobre `all`. */
  byPriority: { high: number; medium: number; low: number };
  /** Las 5 más recientes por `fecha_inicio` y luego `op_id`, descendente. */
  recent: ProductionOrderListItem[];
}

export const getProductionOrderMetrics = (
  orders: ProductionOrderListItem[],
): ProductionOrderMetrics => {
  const statusCounts = new Map<number, { display: string; count: number }>();
  for (const order of orders) {
    const entry = statusCounts.get(order.estatus_op);
    if (entry) entry.count += 1;
    else statusCounts.set(order.estatus_op, { display: order.estatus_op_display, count: 1 });
  }

  // Orden explícito (no el del backend): `fecha_inicio` y luego `op_id`.
  const recent = [...orders]
    .sort((a, b) =>
      b.fecha_inicio === a.fecha_inicio
        ? b.op_id - a.op_id
        : new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime(),
    )
    .slice(0, 5);

  return {
    all: orders.length,
    counted: orders.filter((o) => o.estatus_op !== OP_CANCELLED).length,
    active: orders.filter((o) => OP_ACTIVE.has(o.estatus_op)).length,
    inProduction: orders.filter((o) => o.estatus_op === OP_IN_PRODUCTION).length,
    completed: orders.filter((o) => o.estatus_op === OP_COMPLETED).length,
    stopped: orders.filter((o) => o.estatus_op === OP_STOPPED),
    byStatus: [...statusCounts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([estatus, { display, count }]) => ({ estatus, display, count })),
    byPriority: {
      high: orders.filter((o) => o.prioridad === 1).length,
      medium: orders.filter((o) => o.prioridad === 2).length,
      low: orders.filter((o) => o.prioridad === 3).length,
    },
    recent,
  };
};

// ── Órdenes de bordado ────────────────────────────────────────────────────────

const OB_STOPPED: EmbroideryOrderStatus = 6;
const OB_FINISHED: EmbroideryOrderStatus = 7;
/** Cancelado del enum anterior: fuera de TODOS los conteos de bordado. */
const OB_CANCELLED_LEGACY: EmbroideryOrderStatus = 8;

export interface EmbroideryOrderMetrics {
  /** Sin el 8 (Cancelado legacy). */
  counted: number;
  /** 1-6: en curso o detenidas. */
  active: number;
  /** 7 Finalizado. */
  completed: number;
  /** 6 Detenido. */
  alerts: number;
}

export const getEmbroideryOrderMetrics = (
  orders: EmbroideryOrder[],
): EmbroideryOrderMetrics => {
  const counted = orders.filter((o) => o.estatus_bordado !== OB_CANCELLED_LEGACY);
  return {
    counted: counted.length,
    active: counted.filter((o) => o.estatus_bordado !== OB_FINISHED).length,
    completed: counted.filter((o) => o.estatus_bordado === OB_FINISHED).length,
    alerts: counted.filter((o) => o.estatus_bordado === OB_STOPPED).length,
  };
};
