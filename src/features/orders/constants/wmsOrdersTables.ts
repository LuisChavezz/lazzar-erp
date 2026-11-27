import { defineServerTable, enumParam, positiveIdParam } from "@/src/utils/serverTableParams";
import { SURTIDO_PEDIDOS_KEY } from "@/src/features/order-fulfillment/constants/surtidoPedidosTable";
import { PEDIDO_PROGRAMACION_DESTINOS } from "./pedidoProgramacion";

/**
 * Pestañas de Pedidos de Almacén (`/wms/orders`, EC-993), ambas en MODO
 * SERVIDOR sobre `GET /wms/surtido-pedidos/` (nucleo-erp#1481, EC-988).
 *
 * La pestaña activa va en `?tab=` (sin prefijo; "Por surtir" cuando falta).
 * Cada tabla lleva su `urlPrefix` para que su búsqueda, página y filtros no
 * pasen a la otra: `?ps_q=…` es de Por surtir y `?sd_q=…` de Surtidos. Al
 * backend se envían sin prefijo.
 */
export const WMS_ORDERS_TABS = ["por-surtir", "surtidos"] as const;
export type WmsOrdersTab = (typeof WMS_ORDERS_TABS)[number];
export const WMS_ORDERS_TAB_PARAM = "tab";
export const WMS_ORDERS_DEFAULT_TAB: WmsOrdersTab = "por-surtir";

export const parseWmsOrdersTab = (value: string | null): WmsOrdersTab =>
  (WMS_ORDERS_TABS as readonly string[]).includes(value ?? "")
    ? (value as WmsOrdersTab)
    : WMS_ORDERS_DEFAULT_TAB;

/**
 * Conjunto de cada pestaña: los parámetros FIJOS que el `queryFn` añade a cada
 * petición (lista, exportación) y que definen las opciones de `filtros/`.
 * - Por surtir: lo que ofrece el onboarding de picking (`pedidos_por_surtir_q`:
 *   activo, estatus 3/4, programado, no retenido y con algo surtible
 *   pendiente). El backend fija el estatus e ignora `estatus`.
 * - Surtidos: surtido completo (`pedidas > 0` y `comprometidas = 0`) de
 *   cualquier estatus.
 */
export const WMS_ORDERS_SET_PARAMS = {
  "por-surtir": { por_surtir: "1" },
  surtidos: { estatus: "todos", completo: "1" },
} as const satisfies Record<WmsOrdersTab, Record<string, string>>;

/** Llaves bajo `["surtido-pedidos"]`: invalidar ese prefijo refresca las dos pestañas y los contadores. */
export const wmsOrdersListKey = (tab: WmsOrdersTab) => [...SURTIDO_PEDIDOS_KEY, tab] as const;
export const WMS_ORDERS_RESUMEN_KEY = [...SURTIDO_PEDIDOS_KEY, "resumen"] as const;
export const wmsOrdersFiltrosKey = (tab: WmsOrdersTab) =>
  [...SURTIDO_PEDIDOS_KEY, "filtros", WMS_ORDERS_SET_PARAMS[tab]] as const;

/**
 * Orden: solo los campos que el backend ordena (`CAMPOS_ORDEN`). Sucursal y
 * las cifras de avance no se ordenan (no están en su lista blanca). El backend
 * ya desempata por `id`; el `tiebreaker` lo hace explícito, como en el resto de
 * listas en modo servidor. Sin orden elegido, `-id` (el de siempre).
 */
const ORDERING = {
  fields: ["folio", "cliente_nombre"],
  default: "-id",
  tiebreaker: "-id",
} as const;

/** `?q=`: el backend busca SOLO en folio y `cliente_nombre`. */
const SEARCH = { param: "q" } as const;

export const ETAPAS_SURTIDO_COMPLETO = ["SURTIDO", "DESPACHADO"] as const;

export const porSurtirTable = defineServerTable({
  filters: {
    cliente: positiveIdParam,
    sucursal: positiveIdParam,
    // Pasa si ALGUNA programación va a ese destino (`programacion_conf @>`).
    destino: enumParam(PEDIDO_PROGRAMACION_DESTINOS),
  },
  search: SEARCH,
  ordering: ORDERING,
  pageSizes: [20, 50, 100, 200],
  defaultPageSize: 50,
  urlPrefix: "ps_",
});

/**
 * Un pedido completo solo puede estar en SURTIDO o DESPACHADO (`_etapa`:
 * `comprometidas = 0` con algo pedido), así que el filtro de etapa ofrece
 * solo esas dos.
 */
export const surtidosTable = defineServerTable({
  filters: {
    cliente: positiveIdParam,
    etapa: enumParam(ETAPAS_SURTIDO_COMPLETO),
  },
  search: SEARCH,
  ordering: ORDERING,
  pageSizes: [20, 50, 100, 200],
  defaultPageSize: 50,
  urlPrefix: "sd_",
});
