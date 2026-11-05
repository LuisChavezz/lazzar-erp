import type { PedidoSearchParams } from "../services/actions";

/**
 * Coincidencias que pide un selector por búsqueda. Más que las que cabe
 * revisar a ojo: si no está entre ellas, se acota tecleando.
 */
export const PEDIDO_SEARCH_LIMIT = 50;

export interface PedidoSearchFilters {
  /** Término YA debounced y recortado; vacío = sin búsqueda (los más recientes). */
  q: string;
  /** Códigos de estatus de INCLUSIÓN separados por coma (`"3,4"`), si el selector acota. */
  estatus?: string;
}

/**
 * Query string de una búsqueda de pedidos. `q` y `estatus` solo viajan con
 * valor (un `q=` vacío no filtra nada y ensuciaría la llave); `limit` va
 * SIEMPRE: sin él el endpoint responde la lista completa como arreglo, no la
 * página `{count, results}` que leen los selectores.
 */
export const toPedidoSearchParams = ({ q, estatus }: PedidoSearchFilters): PedidoSearchParams => ({
  ...(q ? { q } : {}),
  ...(estatus ? { estatus } : {}),
  limit: PEDIDO_SEARCH_LIMIT,
});
