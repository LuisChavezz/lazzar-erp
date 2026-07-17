/**
 * Contratos del endpoint de traspasos almacén→almacén (`/wms/transferencias/`).
 *
 * `POST` crea un traspaso (cuerpo de la petición + `Transferencia`, la
 * respuesta de creación). `GET` (listado) devuelve `TransferenciaListItem`,
 * una forma más ligera sin `transferencia_detalle`. `GET .../{id}/` (detalle)
 * devuelve `TransferenciaDetail`, que sí incluye las líneas.
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

/**
 * Renglón de `GET /wms/transferencias/` (listado, sin detalle de líneas).
 * Tenant-scoped por empresa/sucursal — el usuario solo ve traspasos de los
 * almacenes a los que tiene acceso. No paginado (bajo volumen actual).
 *
 * OJO: el timestamp aquí es `fecha_creacion`, no `created_at` como en la
 * respuesta de `create()` (`Transferencia` arriba) — el backend no los
 * unifica, así que no se puede reusar ese tipo para el listado.
 */
export interface TransferenciaListItem {
  id: number;
  folio: string;
  status: string;
  observaciones: string | null;
  fecha_creacion: string;
  almacen_origen: number;
  almacen_origen_nombre: string;
  almacen_destino: number;
  almacen_destino_nombre: string;
  usuario: number;
  usuario_nombre: string;
}

/**
 * Renglón de detalle tal cual lo devuelve `GET /wms/transferencias/{id}/`.
 * Solo uno de `producto`/`producto_variante` viene no-nulo por línea (y su
 * `_nombre` correspondiente); el otro par viaja en `null`.
 *
 * `ubicacion_origen_nombre`/`ubicacion_destino_nombre` llegan pre-formateados
 * como `"{almacén} - {pasillo}-{rack}-{nivel}-{posicion}"` (o con
 * `"(sin almacén)"` cuando la ubicación no tiene almacén asignado) — se
 * muestran tal cual, sin parsear ni reconstruir.
 *
 * `lote`/`serie` siempre son `null` hoy (catálogos vacíos en este sistema) y
 * la captura ya los eliminó del formulario de creación — se omiten de la UI
 * de detalle a propósito, no se modelan aquí.
 */
export interface TransferenciaDetalleLine {
  id: number;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  producto_variante_nombre: string | null;
  /** Cantidad trasladada, string decimal de 4 posiciones (ej. `"10.0000"`). */
  cantidad: string;
  ubicacion_origen: number | null;
  ubicacion_origen_nombre: string | null;
  ubicacion_destino: number | null;
  ubicacion_destino_nombre: string | null;
}

/**
 * Respuesta de `GET /wms/transferencias/{id}/`: los mismos campos de
 * `TransferenciaListItem` más `transferencia_detalle`. Extiende
 * `TransferenciaListItem` (en vez de redeclarar) para que el detalle sea
 * asignable donde se espera un renglón de listado — útil si en el futuro se
 * quiere refrescar la fila del listado en caché con datos recién leídos del
 * detalle (`queryClient.setQueryData(["transferencias"], ...)`, patrón que
 * hoy este módulo no usa, pero que si se necesitara no pediría cambiar este
 * tipo). Por ahora esa asignabilidad NO se ejerce en ningún lado — el único
 * consumidor (`StockTransferDetailDialog`) solo lee campos directos.
 *
 * OJO: el backend ya diverge en un campo entre `Transferencia` (creación,
 * `created_at`) y `TransferenciaListItem` (listado, `fecha_creacion`) pese a
 * modelar "el mismo" traspaso — si el serializer de detalle llegara a
 * divergir de `TransferenciaListItem` de la misma forma, TypeScript NO lo
 * señalaría, porque este tipo hereda lo que sea que declare aquel.
 */
export interface TransferenciaDetail extends TransferenciaListItem {
  transferencia_detalle: TransferenciaDetalleLine[];
}
