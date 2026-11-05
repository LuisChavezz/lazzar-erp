import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";

/**
 * Si un pedido ya ligado a una orden de compra se puede seguir ligando:
 * `"unavailable"` = cancelado, inactivo (borrado) o fuera de lo que el
 * usuario ve; `"unknown"` = la respuesta no alcanza para decidirlo.
 */
export type LinkedPedidoAvailability = "available" | "unavailable" | "unknown";

/** Lo que hace falta de un pedido para decidir. */
interface PedidoStatusRow {
  id: number;
  estatus: number;
  activo: boolean;
}

/** Misma regla que el catálogo del selector: ni cancelado ni inactivo. */
export const isLinkablePedidoRow = (row: Pick<PedidoStatusRow, "estatus" | "activo">) =>
  row.activo !== false && row.estatus !== PEDIDO_ESTATUS.CANCELADO;

/**
 * Decide la disponibilidad de UN pedido a partir de la página de
 * `GET /ventas/pedidos/?folio=<su folio>&limit=` (SIN `?estatus=`, así que los
 * cancelados sí vienen). El listado solo devuelve pedidos activos y del
 * alcance del usuario, así que:
 *
 * - viene en la página → se decide por su estatus;
 * - no viene y la página trae TODAS las coincidencias del folio → no está
 *   activo o no se ve: no disponible (lo mismo que el selector concluía antes
 *   al no encontrarlo en la lista completa);
 * - no viene pero hay más coincidencias que la página → no se puede saber, y
 *   no se acusa a un pedido válido.
 */
export const linkedPedidoAvailabilityFromPage = (
  id: number,
  page: Pick<PaginatedListResponse<PedidoStatusRow>, "count" | "results">,
): LinkedPedidoAvailability => {
  const row = page.results.find((pedido) => pedido.id === id);
  if (row) return isLinkablePedidoRow(row) ? "available" : "unavailable";
  return page.count <= page.results.length ? "unavailable" : "unknown";
};
