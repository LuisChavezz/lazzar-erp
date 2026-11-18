import { v1_api } from "@/src/api/v1.api";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type {
  SurtidoPedido,
  SurtidoPedidoDetalle,
} from "../interfaces/order-fulfillment.interface";

/**
 * Página del avance de surtido (`?page=&page_size=` → `{count, next, previous,
 * results}`). Los filtros (`q`, `estatus`, `pendientes`, `sucursal`) llegan ya
 * validados desde `useServerTable`.
 */
export const getSurtidoPedidosPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<SurtidoPedido>> => {
  const { data } = await v1_api.get<PaginatedListResponse<SurtidoPedido>>(
    "/wms/surtido-pedidos/",
    { params },
  );
  return data;
};

/** Totales del pedido y un renglón por talla. 404 fuera del alcance del usuario. */
export const getSurtidoPedidoDetalle = async (pedidoId: number): Promise<SurtidoPedidoDetalle> => {
  const { data } = await v1_api.get<SurtidoPedidoDetalle>(`/wms/surtido-pedidos/${pedidoId}/`);
  return data;
};
