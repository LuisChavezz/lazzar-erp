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
  /** Solo los pedidos de este cliente (`?cliente=`, id). */
  cliente?: number;
  /** Solo los pedidos en esta moneda (`?moneda=`, id). */
  moneda?: number;
}

/**
 * Query string de una búsqueda de pedidos. `q`, `estatus`, `cliente` y `moneda`
 * solo viajan con valor (un `q=` vacío no filtra nada y ensuciaría la llave; un
 * id que no es positivo no es un filtro); `limit` va
 * SIEMPRE: sin él el endpoint responde la lista completa como arreglo, no la
 * página `{count, results}` que leen los selectores.
 */
export const toPedidoSearchParams = ({
  q,
  estatus,
  cliente,
  moneda,
}: PedidoSearchFilters): PedidoSearchParams => ({
  ...(q ? { q } : {}),
  ...(estatus ? { estatus } : {}),
  ...(cliente !== undefined && cliente > 0 ? { cliente } : {}),
  ...(moneda !== undefined && moneda > 0 ? { moneda } : {}),
  limit: PEDIDO_SEARCH_LIMIT,
});
