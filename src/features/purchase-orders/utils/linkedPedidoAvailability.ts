import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";

/**
 * Si un pedido ya ligado a una orden de compra se puede seguir ligando:
 * `"unavailable"` = cancelado, inactivo (borrado) o fuera del alcance del
 * usuario; `"unknown"` = la respuesta no alcanza para decidirlo.
 */
export type LinkedPedidoAvailability = "available" | "unavailable" | "unknown";

/**
 * Resultado de consultar un pedido ligado: su disponibilidad y, si la
 * respuesta lo trajo, su cliente (para la segunda línea del renglón: los
 * `pedidos_vinculados` de la OC solo traen id y folio).
 */
export interface LinkedPedidoLookup {
  availability: LinkedPedidoAvailability;
  cliente: string | null;
}

/** Lo que hace falta de un pedido para decidir y rotular. */
interface PedidoStatusRow {
  id: number;
  estatus: number;
  activo: boolean;
  cliente_nombre?: string | null;
  cliente_razon_social?: string | null;
}

/** Misma regla que el catálogo del selector: ni cancelado ni inactivo. */
export const isLinkablePedidoRow = (row: Pick<PedidoStatusRow, "estatus" | "activo">) =>
  row.activo !== false && row.estatus !== PEDIDO_ESTATUS.CANCELADO;

/** Disponibilidad y cliente de una fila (del listado o del detalle) de ESE pedido. */
export const linkedPedidoLookupFromRow = (row: PedidoStatusRow): LinkedPedidoLookup => ({
  availability: isLinkablePedidoRow(row) ? "available" : "unavailable",
  cliente: row.cliente_nombre ?? row.cliente_razon_social ?? null,
});

/**
 * Decide a partir de la página de `GET /ventas/pedidos/?folio=<su folio>&limit=`
 * (SIN `?estatus=`, así que los cancelados sí vienen). El listado solo
 * devuelve pedidos activos y del alcance del usuario, así que:
 *
 * - viene en la página → se decide por su estatus;
 * - no viene y la página trae TODAS las coincidencias del folio → no está
 *   activo o no se ve: no disponible (lo mismo que el selector concluía antes
 *   al no encontrarlo en la lista completa);
 * - no viene pero hay más coincidencias que la página → no se puede saber, y
 *   no se acusa a un pedido válido.
 */
export const linkedPedidoLookupFromPage = (
  id: number,
  page: Pick<PaginatedListResponse<PedidoStatusRow>, "count" | "results">,
): LinkedPedidoLookup => {
  const row = page.results.find((pedido) => pedido.id === id);
  if (row) return linkedPedidoLookupFromRow(row);
  return {
    availability: page.count <= page.results.length ? "unavailable" : "unknown",
    cliente: null,
  };
};

/**
 * Lectura fallida del DETALLE de un pedido ligado: un 404 o un 403 dicen lo
 * mismo que no encontrarlo en el listado (ya no existe o ya no está al alcance
 * del usuario), así que es `"unavailable"`. Cualquier otro fallo (5xx, red) no
 * dice nada del pedido: devuelve `null` y el que llama lo deja como error.
 */
export const linkedPedidoLookupFromDetailError = (error: unknown): LinkedPedidoLookup | null =>
  isNotFoundOrForbiddenError(error) ? { availability: "unavailable", cliente: null } : null;
