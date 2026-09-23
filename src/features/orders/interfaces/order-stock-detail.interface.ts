/**
 * Respuesta de `GET /ventas/pedidos/{id}/stock-detalle/`: un elemento por
 * línea del pedido (producto + color) con sus tallas.
 *
 * - `cantidad_pedida` siempre es entero; `stock_actual` y `diferencia` pueden
 *   traer decimales (`diferencia = stock_actual − cantidad_pedida`, negativa =
 *   faltante).
 * - `color` puede ser `"N/A"` y `producto` `"Muestra sin producto"`.
 * - Las líneas de muestra llegan con `tallas: []`; un pedido sin líneas, `[]`.
 * - `stock_actual` es la existencia BRUTA en todos los almacenes de la
 *   empresa+sucursal del pedido: no descuenta lo comprometido en otros pedidos.
 */
export interface OrderStockDetailSize {
  talla: string;
  cantidad_pedida: number;
  stock_actual: number;
  diferencia: number;
}

export interface OrderStockDetail {
  producto: string;
  color: string;
  tallas: OrderStockDetailSize[];
}
