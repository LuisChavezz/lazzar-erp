import {
  defineServerTable,
  enumParam,
  positiveIdParam,
  type ServerTableFilterValues,
} from "@/src/utils/serverTableParams";
import { PEDIDO_PROGRAMACION_DESTINOS } from "@/src/features/orders/constants/pedidoProgramacion";
import type { PickingEstado, PickingEstadoEmpaque } from "../interfaces/picking.interface";

/** Prefijo de TODAS las consultas de surtidos (lista, resumen, filtros): se invalida por él. */
export const PICKINGS_KEY = ["pickings"] as const;

export const PICKING_ESTADO_VALUES = [
  "Pendiente",
  "Asignado",
  "En proceso",
  "Pausado",
  "Completado",
  "Parcial",
  "Cancelado",
] as const satisfies readonly PickingEstado[];

export const PICKING_EMPAQUE_VALUES = [
  "POR_EMPACAR",
  "EMPACADO",
  "ENVIADO",
] as const satisfies readonly PickingEstadoEmpaque[];

/** Periodos de "cuándo se surtió" que se traducen a `fecha_desde`/`fecha_hasta`. */
export const PICKING_PERIODO_VALUES = ["hoy", "7d", "mes", "mes_pasado"] as const;
export type PickingPeriodo = (typeof PICKING_PERIODO_VALUES)[number];
export const PICKING_PERIODO_LABELS: Record<PickingPeriodo, string> = {
  hoy: "Hoy",
  "7d": "Últimos 7 días",
  mes: "Este mes",
  mes_pasado: "Mes pasado",
};

/** Ventanas de entrega que se traducen a `pedido_fecha_entrega_desde`/`_hasta`. */
export const PICKING_ENTREGA_VALUES = ["vencida", "3d", "7d"] as const;
export type PickingEntregaVentana = (typeof PICKING_ENTREGA_VALUES)[number];
export const PICKING_ENTREGA_LABELS: Record<PickingEntregaVentana, string> = {
  vencida: "Ya pasó la fecha",
  "3d": "Hoy a 3 días",
  "7d": "Próximos 7 días",
};

/**
 * Contrato del listado con `GET /wms/pickings/?vista=lista` (nucleo-erp#1283/#1284):
 * - `estado`, `programacion_destino`, `estado_empaque`, `cliente`, `operador`:
 *   tal cual al backend.
 * - `periodo` y `entrega` son de la URL: `pickingsApiParams` los traduce a los
 *   rangos de fecha del backend con el día de México.
 * - `search`: folio, pedido o cliente.
 * - `ordering`: `created_at`, `pedido_fecha_entrega`, `piezas`, `estado_empaque`;
 *   el backend desempata por `id` en la misma dirección.
 * - Paginación `limit`/`offset`.
 */
export const pickingsTable = defineServerTable({
  filters: {
    estado: enumParam(PICKING_ESTADO_VALUES),
    programacion_destino: enumParam(PEDIDO_PROGRAMACION_DESTINOS),
    estado_empaque: enumParam(PICKING_EMPAQUE_VALUES),
    cliente: positiveIdParam,
    operador: positiveIdParam,
    periodo: enumParam(PICKING_PERIODO_VALUES),
    entrega: enumParam(PICKING_ENTREGA_VALUES),
  },
  search: { param: "search" },
  ordering: {
    fields: ["created_at", "pedido_fecha_entrega", "piezas", "estado_empaque"],
    default: "-created_at",
  },
  pageSizes: [20, 50, 100],
  defaultPageSize: 20,
});

export type PickingsFilterValues = ServerTableFilterValues<(typeof pickingsTable)["filters"]>;
