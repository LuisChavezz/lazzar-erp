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
 * Prefijo de la tabla de "Mis pedidos" en modo servidor. Va aparte del de Mesa
 * de Control y Compras (que comparten `ORDERS_QUERY_KEY`) porque su
 * `?mis_pedidos=true` lo añade la acción y no viaja en los parámetros de la
 * tabla: con el mismo prefijo, las dos listas compartirían llave. Sigue bajo
 * `["orders"]`, así que las mutaciones de pedidos la refrescan.
 */
export const MIS_PEDIDOS_TABLE_QUERY_KEY = [...ORDERS_QUERY_KEY, "mis-pedidos"] as const;

/**
 * Llave de los indicadores de Mesa de Control (`kpis-mesa/`) con los filtros de
 * la tabla: bajo el prefijo, así que cancelar, editar o programar un pedido los
 * refresca junto con la lista.
 */
export const pedidoKpisMesaQueryKey = (params: Record<string, string>) =>
  [...ORDERS_QUERY_KEY, "kpis-mesa", params] as const;

/**
 * Llave de los catálogos de los filtros de encabezado (`opciones/`), con o sin
 * `mis_pedidos`. Bajo el prefijo: un pedido nuevo o editado puede traer un
 * cliente, vendedor o mes que antes no estaba.
 */
export const pedidoFilterOptionsQueryKey = (misPedidos: boolean) =>
  [...ORDERS_QUERY_KEY, "opciones", { mis_pedidos: misPedidos }] as const;

/**
 * Llave de una búsqueda de pedidos de un selector: bajo el prefijo (la
 * refrescan las mutaciones de pedidos) y bajo `"search"`, aparte de la lista
 * completa, porque trae solo una página.
 */
export const pedidoSearchQueryKey = (params: PedidoSearchParams) =>
  [...ORDERS_QUERY_KEY, "search", params] as const;
