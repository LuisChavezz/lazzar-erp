import { defineServerTable, enumParam } from "@/src/utils/serverTableParams";
import { PICKING_PRIORIDAD_ORDER } from "../constants/pickingPrioridad";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import type {
  PickingEstado,
  PickingKpis,
  PickingPrioridad,
} from "../interfaces/picking.interface";

/** Estados de `Picking.Estado`, tal como viajan en `?estado=`. */
export const PICKING_ESTADO_VALUES = Object.keys(PICKING_STATUS_CONFIG) as PickingEstado[];

/**
 * Contrato del listado con `GET /wms/pickings/` (EC-921, nucleo-erp #1260).
 *
 * - `estado` y `prioridad`: el backend acepta uno o varios separados por coma;
 *   los filtros de encabezado eligen uno, así que se envía uno (`enumParam`).
 *   Un valor fuera del catálogo sería un 400 y se trata como ausente.
 * - `search`: folio del picking, folio del pedido y el nombre del operador tal
 *   como lo pinta la fila (no busca por estado ni prioridad).
 * - `ordering`: los campos de las columnas visibles, todos en la lista blanca
 *   del backend. `prioridad` ordena por urgencia (BAJA → MEDIA → ALTA) en el
 *   servidor. El default reproduce el del backend (`-created_at`), con `-id` de
 *   desempate.
 */
export const pickingsTable = defineServerTable({
  filters: {
    estado: enumParam(PICKING_ESTADO_VALUES),
    prioridad: enumParam(PICKING_PRIORIDAD_ORDER),
  },
  search: { param: "search" },
  ordering: {
    fields: ["folio", "pedido_folio", "operador_nombre", "estado", "prioridad", "created_at"],
    default: "-created_at",
    tiebreaker: "-id",
  },
});

/**
 * Parámetros de `kpis/` a partir de los `criteria` de la tabla: los mismos
 * filtros y búsqueda, sin `ordering` (el backend lo ignora, y en la llave haría
 * que reordenar la tabla volviera a pedir los mismos indicadores).
 */
export const toPickingKpisParams = (
  criteria: Readonly<Record<string, string>>,
): Record<string, string> =>
  Object.fromEntries(Object.entries(criteria).filter(([key]) => key !== "ordering"));

/** Surtidos por prioridad del catálogo. */
export type PickingPrioridadCounts = Record<PickingPrioridad, number>;

/**
 * `por_prioridad` de `kpis/` → conteo por prioridad del catálogo. El backend
 * manda siempre las tres; una que falte queda en 0 y un valor fuera del
 * catálogo se ignora en vez de romper el desglose.
 */
export const toPickingPrioridadCounts = (kpis: PickingKpis): PickingPrioridadCounts => {
  const counts: PickingPrioridadCounts = { ALTA: 0, MEDIA: 0, BAJA: 0 };
  for (const fila of kpis.por_prioridad) {
    if (fila.prioridad in counts) counts[fila.prioridad] = fila.total;
  }
  return counts;
};
