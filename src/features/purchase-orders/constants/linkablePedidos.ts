import { PEDIDO_ESTATUS, pedidoEstatusParamExcept } from "@/src/features/orders/constants/pedidoStatus";

/**
 * `?estatus=` de los pedidos que se ofrecen para ligar a una orden de compra:
 * todos menos el CANCELADO. Es una EXCLUSIÓN a propósito, para que un estatus
 * nuevo se ofrezca en vez de ocultarse en silencio. Los inactivos (borrados)
 * ya no los devuelve `GET /ventas/pedidos/`.
 */
export const LINKABLE_PEDIDO_ESTATUS = pedidoEstatusParamExcept([PEDIDO_ESTATUS.CANCELADO]);
