import type { OrdersQueryParams, PedidoSearchParams } from "../services/actions";

/**
 * Prefijo de TODAS las consultas de `GET /ventas/pedidos/`: la lista completa
 * (`ordersQueryKey`), las búsquedas de los selectores
 * (`pedidoSearchQueryKey`) y cualquier lista paginada que cuelgue de él. Las
 * mutaciones que cambian pedidos invalidan ESTE prefijo, nunca una llave
 * concreta, para refrescar todas las variantes a la vez.
 */
export const ORDERS_QUERY_KEY = ["orders"] as const;

/**
 * Llave de la lista COMPLETA (sin paginar) de pedidos, con sus filtros si los
 * hay. Va bajo `"full"` y no en el prefijo pelado: así ninguna búsqueda ni
 * página comparte llave con ella, y un `exact: true` sobre esta llave toca solo
 * esta variante. Para invalidar todo, `ORDERS_QUERY_KEY`.
 */
export const ordersQueryKey = (params?: OrdersQueryParams) =>
  params
    ? ([...ORDERS_QUERY_KEY, "full", params] as const)
    : ([...ORDERS_QUERY_KEY, "full"] as const);

/**
 * Llave de una búsqueda de pedidos de un selector: bajo el prefijo (la
 * refrescan las mutaciones de pedidos) y bajo `"search"`, aparte de la lista
 * completa, porque trae solo una página.
 */
export const pedidoSearchQueryKey = (params: PedidoSearchParams) =>
  [...ORDERS_QUERY_KEY, "search", params] as const;

/**
 * Llave de la disponibilidad de UN pedido ya ligado a una orden de compra
 * (`useLinkedPedidoAvailability`): bajo el prefijo, así que la refrescan las
 * mutaciones que cancelan o cambian pedidos.
 */
export const linkedPedidoAvailabilityQueryKey = (id: number, folio: string | null) =>
  [...ORDERS_QUERY_KEY, "linked-availability", id, folio] as const;
