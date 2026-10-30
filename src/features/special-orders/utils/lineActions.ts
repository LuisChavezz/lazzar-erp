import { isPedidoTerminal } from "@/src/features/orders/constants/pedidoStatus";

/**
 * ¿Se ofrecen las acciones de las líneas (alta de SKU y alta en catálogo)?
 * Solo si el usuario las ve (`canSeeLineActions`, ver `SpecialOrderPageContent`)
 * y el pedido no terminó: `variante-onboarding` y `alta-catalogo` rechazan un
 * pedido CANCELADO con `400 {"pedido"}`, que es justo lo que `isPedidoTerminal`
 * considera final. Un pedido cancelado sigue saliendo en pedidos especiales.
 */
export const canActOnSpecialOrderLines = (canSeeLineActions: boolean, estatus: number): boolean =>
  canSeeLineActions && !isPedidoTerminal(estatus);
