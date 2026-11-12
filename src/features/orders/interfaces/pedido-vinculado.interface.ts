/**
 * Cliente del pedido madre de una orden de trabajo (EC-880), tal como lo arma
 * `cliente_de_pedido` en el backend: los tres datos salen EN BLOQUE de la foto
 * del cliente que guarda el pedido (lo que se vendió) o, si el pedido no tiene
 * foto, del cliente vivo; nunca mezclados. Un dato vacío llega en `null`. `id`
 * es siempre el del cliente del pedido.
 */
export interface PedidoVinculadoCliente {
  id: number;
  nombre: string | null;
  razon_social: string | null;
  rfc: string | null;
}

/**
 * `pedido_vinculado` de los detalles de OP, OB, OR y OCM (`armar_pedido_vinculado`).
 * `cliente` es OPCIONAL en el tipo: lo agregó EC-880, y una respuesta sin la
 * clave no debe leerse como "sin cliente" (el PDF omite el bloque).
 */
export interface PedidoVinculado {
  id: number;
  folio: string;
  cliente?: PedidoVinculadoCliente | null;
}
