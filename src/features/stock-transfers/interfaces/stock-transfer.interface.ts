/**
 * Contratos del endpoint de traspasos almacén→almacén
 * (`POST /wms/transferencias/`).
 *
 * El ViewSet `Transferencia` implementa SOLO `create()` — todavía no existen
 * `list`/`retrieve`/`update`, por lo que aquí solo se modela el cuerpo de la
 * petición y una respuesta razonable (que este módulo no renderiza aún).
 *
 * Los nombres de campo se conservan en español, tal cual el contrato del API.
 */

/** Renglón de detalle del traspaso, tal cual viaja en el cuerpo de la petición. */
export interface TransferenciaDetallePayload {
  /**
   * Producto (catálogo base). Se envía `producto` O `producto_variante`,
   * nunca ambos: el que no aplica viaja como `null`.
   */
  producto: number | null;
  /** Variante de producto (SKU con color/talla). Excluyente con `producto`. */
  producto_variante: number | null;
  /** Cantidad a trasladar como string decimal de 4 posiciones (ej. `"10.0000"`). */
  cantidad: string;
  /** Ubicación de origen dentro de `almacen_origen`. Opcional (`null`). */
  ubicacion_origen: number | null;
  /** Ubicación de destino dentro de `almacen_destino`. Opcional (`null`). */
  ubicacion_destino: number | null;
  /** Lote. Opcional (`null`). */
  lote: string | null;
  /** Serie. Opcional (`null`). */
  serie: string | null;
}

/**
 * Cuerpo de `POST /wms/transferencias/`.
 *
 * `empresa`, `sucursal`, `folio`, `usuario` y `status` los resuelve el backend
 * (se ignoran si el cliente los envía) — por eso NO forman parte de este tipo.
 * Tampoco existe `pedido` en este endpoint (solo aplica a entrada/salida/ajuste).
 */
export interface CreateTransferenciaPayload {
  /** Almacén de origen. Requerido y distinto de `almacen_destino`. */
  almacen_origen: number;
  /** Almacén de destino. Requerido y distinto de `almacen_origen`. */
  almacen_destino: number;
  /** Observaciones del traspaso. Opcional — se omite por completo si va vacía. */
  observaciones?: string;
  /** Renglones del traspaso. Al menos uno. */
  transferencia_detalle: TransferenciaDetallePayload[];
}

/** Renglón de detalle tal cual lo devuelve el backend tras crear el traspaso. */
export interface TransferenciaDetalleResponse extends TransferenciaDetallePayload {
  id: number;
}

/**
 * Respuesta de la creación de un traspaso. El backend crea tres registros
 * (`Transferencia` cabecera, `TransferenciaDetalle` líneas y un único
 * `MovimientoInventario` con `tipo_movimiento = "TRANSFERENCIA"`); aquí solo se
 * modela la cabecera devuelta. Este módulo aún no la consume, por lo que se
 * mantiene deliberadamente laxa.
 */
export interface Transferencia {
  id: number;
  folio: string;
  almacen_origen: number;
  almacen_destino: number;
  observaciones: string | null;
  /** Estado del traspaso — por defecto `"COMPLETADA"` (lo fija el backend). */
  status: string;
  empresa: number;
  sucursal: number;
  usuario: number;
  transferencia_detalle: TransferenciaDetalleResponse[];
  created_at: string;
}
