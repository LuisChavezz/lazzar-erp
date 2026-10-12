/**
 * Contrato de `POST /ventas/pedidos/{id}/vincular-sku-muestra/`: copia a UNA
 * talla de una línea de muestra el SKU que Producción tiene disponible para
 * ella (`sku_produccion` → `sku_muestra`).
 *
 * El cliente NO elige el SKU: el cuerpo solo identifica la talla y el backend
 * ignora cualquier otro campo, así que no se manda ninguno. Una talla por
 * llamada. Idempotente; no existe la operación inversa (desvincular).
 */
export interface VincularSkuMuestraPayload {
  /**
   * Id de `PedidoDetalleTalla` (`detalles[].tallas[].id`). SIEMPRE entero: un
   * valor no numérico hace que el backend responda 500.
   */
  pedido_detalle_talla_id: number;
}

/**
 * Respuesta `200`. No dice si el SKU se espejó a la cotización de origen (el
 * backend lo intenta, pero a menudo no ocurre), así que nada en la UI lo afirma.
 */
export interface VincularSkuMuestraResponse {
  pedido_detalle_talla_id: number;
  sku_muestra: string;
}
