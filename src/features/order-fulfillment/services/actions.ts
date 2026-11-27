import { v1_api } from "@/src/api/v1.api";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type {
  SurtidoPedido,
  SurtidoPedidoDetalle,
  SurtidoPedidosFiltros,
  SurtidoPedidosResumen,
} from "../interfaces/order-fulfillment.interface";

/**
 * Página del avance de surtido (`?page=&page_size=` → `{count, next, previous,
 * results}`). Los filtros (`q`, `estatus`, `pendientes`, `sucursal`, y los de
 * EC-988: `por_surtir`, `completo`, `cliente`, `destino`, `etapa`, `ordering`)
 * llegan ya validados desde `useServerTable`.
 */
export const getSurtidoPedidosPage = async <TRow extends SurtidoPedido = SurtidoPedido>(
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<TRow>> => {
  const { data } = await v1_api.get<PaginatedListResponse<TRow>>(
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

/**
 * Clientes y sucursales del conjunto (`por_surtir=1`, o `estatus=todos&completo=1`),
 * sin los filtros de columna (EC-988).
 */
export const getSurtidoPedidosFiltros = async (
  params: Record<string, string>,
): Promise<SurtidoPedidosFiltros> => {
  const { data } = await v1_api.get<SurtidoPedidosFiltros>("/wms/surtido-pedidos/filtros/", {
    params,
  });
  return data;
};

/** Números de las pestañas Por surtir y Surtidos; no acepta filtros (EC-988). */
export const getSurtidoPedidosResumen = async (): Promise<SurtidoPedidosResumen> => {
  const { data } = await v1_api.get<SurtidoPedidosResumen>("/wms/surtido-pedidos/resumen/");
  return data;
};
