import {
  booleanFlagParam,
  defineServerTable,
  enumParam,
  positiveIdParam,
  type ServerTableFilterValues,
} from "@/src/utils/serverTableParams";
import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";

/** Prefijo de las consultas del avance de surtido (lista y detalle). */
export const SURTIDO_PEDIDOS_KEY = ["surtido-pedidos"] as const;

/**
 * Valores de `?estatus=` que ofrece la pantalla. Sin el filtro el backend
 * aplica su default `3,4` (autorizados y en proceso); `todos` quita el filtro.
 * El endpoint acepta cualquier lista de enteros, pero aquí solo se ofrecen las
 * combinaciones con sentido para surtir.
 */
export const SURTIDO_ESTATUS_VALUES = [
  `${PEDIDO_ESTATUS.AUTORIZADA}`,
  `${PEDIDO_ESTATUS.EN_PROCESO}`,
  "todos",
] as const;

export type SurtidoEstatusValue = (typeof SURTIDO_ESTATUS_VALUES)[number];

export const SURTIDO_ESTATUS_LABELS: Record<SurtidoEstatusValue, string> = {
  // `PEDIDO_ESTATUS.AUTORIZADA` / `EN_PROCESO`, como viajan en `?estatus=`.
  "3": "Autorizados",
  "4": "En proceso",
  todos: "Todos los estatus",
};

/** Etiqueta de la opción "sin filtro" (el default del backend). */
export const SURTIDO_ESTATUS_DEFAULT_LABEL = "Autorizados y en proceso";

/**
 * Contrato del listado con `GET /wms/surtido-pedidos/` (nucleo-erp #1223):
 * - `q`: folio o cliente (contiene, sin distinguir mayúsculas).
 * - `estatus`: ver `SURTIDO_ESTATUS_VALUES`.
 * - `pendientes`: el backend acepta `1` o `true`; la URL usa `true`
 *   (`booleanFlagParam`) y su ausencia significa "todos".
 * - `sucursal`: id entero.
 * - Sin `ordering`: el orden es fijo (`-id`) y el endpoint ignora `?ordering`.
 * - Paginación `page`/`page_size` (máx. 200 en el backend).
 */
export const surtidoPedidosTable = defineServerTable({
  filters: {
    estatus: enumParam(SURTIDO_ESTATUS_VALUES),
    pendientes: booleanFlagParam,
    sucursal: positiveIdParam,
  },
  search: { param: "q" },
  pageSizes: [20, 50, 100, 200],
  defaultPageSize: 50,
});

export type SurtidoPedidosFilterValues = ServerTableFilterValues<
  (typeof surtidoPedidosTable)["filters"]
>;

export type SurtidoPedidosFilterKey = keyof SurtidoPedidosFilterValues;
