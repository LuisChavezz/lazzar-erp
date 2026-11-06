import { PURCHASE_ORDER_STATUS } from "../constants/purchaseOrderStatus";

/** Coincidencias que pide un selector de OC; si no está entre ellas, se acota tecleando. */
export const PURCHASE_ORDER_SEARCH_LIMIT = 50;

export interface PurchaseOrderSearchFilters {
  /** Término YA debounced y recortado; vacío = sin búsqueda (las más recientes). */
  search: string;
  /** Estatus de INCLUSIÓN separados por coma (`"1,2,3"`); el backend acepta CSV (EC-782). */
  estatus?: string;
  /** Solo OC con proveedor (`?con_proveedor=true`): el FK es `SET_NULL`. */
  conProveedor?: boolean;
}

/**
 * `?estatus=` con TODOS los estatus de `PURCHASE_ORDER_STATUS` menos
 * `excluded`. El backend solo filtra por INCLUSIÓN; derivarlo de una EXCLUSIÓN
 * sobre el mapa completo hace que un estatus nuevo se ofrezca sin tocar a quien
 * lo usa (mismo criterio que `pedidoEstatusParamExcept`).
 */
export const purchaseOrderEstatusParamExcept = (excluded: readonly number[]): string =>
  Object.values(PURCHASE_ORDER_STATUS)
    .filter((estatus) => !excluded.includes(estatus))
    .join(",");

/**
 * Query string de una búsqueda de OC. `search`, `estatus` y `con_proveedor`
 * solo viajan con valor; `limit` va SIEMPRE: sin él el endpoint responde la
 * lista completa como arreglo, no la página `{count, results}`.
 */
export const toPurchaseOrderSearchParams = ({
  search,
  estatus,
  conProveedor,
}: PurchaseOrderSearchFilters): Record<string, string | number> => ({
  ...(search ? { search } : {}),
  ...(estatus ? { estatus } : {}),
  ...(conProveedor ? { con_proveedor: "true" } : {}),
  limit: PURCHASE_ORDER_SEARCH_LIMIT,
});
