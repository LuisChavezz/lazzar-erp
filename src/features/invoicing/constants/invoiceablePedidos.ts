import { PEDIDO_ESTATUS, pedidoEstatusParamExcept } from "@/src/features/orders/constants/pedidoStatus";

/**
 * `?estatus=` del selector de pedidos de "Nueva Factura": todo menos los
 * estatus que NO se facturan. Los previos a la autorización (Borrador, Por
 * autorizar) y el cancelado. Es una EXCLUSIÓN a propósito: cualquier estatus
 * desde la autorización en adelante sigue facturable. El backend no valida el
 * estatus del pedido al facturar; los inactivos no los devuelve el listado.
 */
export const INVOICEABLE_PEDIDO_ESTATUS = pedidoEstatusParamExcept([
  PEDIDO_ESTATUS.BORRADOR,
  PEDIDO_ESTATUS.POR_AUTORIZAR,
  PEDIDO_ESTATUS.CANCELADO,
]);
