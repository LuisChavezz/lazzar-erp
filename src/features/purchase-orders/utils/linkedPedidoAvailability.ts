import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";

/**
 * ¿Un pedido se puede (seguir) ligando a una orden de compra? Misma regla que
 * el catálogo del selector (`LINKABLE_PEDIDO_ESTATUS`): ni cancelado ni dado de
 * baja. Para los ya ligados se decide con el `estatus` y el `activo` que trae
 * `pedidos_vinculados` (EC-782), sin consultar el pedido aparte.
 */
export const isLinkablePedidoRow = (row: { estatus: number; activo: boolean }) =>
  row.activo !== false && row.estatus !== PEDIDO_ESTATUS.CANCELADO;
