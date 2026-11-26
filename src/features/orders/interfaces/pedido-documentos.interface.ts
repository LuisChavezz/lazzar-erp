/**
 * Respuesta de `GET /ventas/pedidos/{id}/documentos/` (EC-914, backend #1225,
 * EC-916 y EC-920): cada documento que nació del pedido, en un bloque por tipo.
 *
 * Contrato:
 * - Siempre llegan TODAS las llaves. Una lista vacía es "sin registros".
 * - Listas sin paginar, ordenadas por `id`.
 * - Todo es de la empresa del pedido. Para quien no es admin ni superusuario,
 *   se acotan además a sus sucursales (nucleo-erp #1304): salidas a maquila,
 *   pickings, despachos, movimientos de inventario, facturas, cobros, OB/OR/OCM
 *   y packings. `pre_ordenes`, `envios`, `cotizaciones`, `ordenes_compra` y
 *   `ordenes_produccion` solo se acotan por empresa.
 * - `salidas_maquila`, `facturas` y `cobros` son `null` cuando el usuario no
 *   tiene el permiso de lectura de su módulo (nucleo-erp #1304):
 *   `R-PRODUCCION-OP`; `R-CONTABILIDAD` o `R-CONTABILIDAD-FACTURACION`;
 *   `R-CONTABILIDAD` o `R-CONTABILIDAD-CXC`. Su bloque no se muestra (no es
 *   "sin registros"). Las demás llaves siempre son listas.
 * - Fechas: un `DateField` llega como "YYYY-MM-DD" y un `DateTimeField` como
 *   ISO con hora; los dos pasan por `formatShortCalendarDate`.
 * - Decimales como NÚMERO JSON (`106185.24`), no como string: el endpoint arma
 *   las filas con `.values()` y no pasa por un serializer. Se tipan
 *   `number | string` para no depender de esa diferencia.
 */

/**
 * Fila de los bloques que comparten forma con `pedido.documentos`
 * (cotización, OC, órdenes de producción/bordado/reflejante/corte de manga y
 * packings, EC-920). `estatus` es el valor guardado (texto o código numérico,
 * según el modelo) y `estatus_label` su etiqueta. La cotización no tiene folio:
 * llega `null`.
 */
export interface PedidoDocumentoFila {
  id: number;
  folio: string | null;
  estatus: string | number | null;
  estatus_label: string | null;
  fecha: string | null;
}

export interface PedidoDocumentoPreOrden {
  id: number;
  origen: string;
  estatus: string;
  op_id: number | null;
  created_at: string;
  op_folio: string | null;
  /** `estatus_op` de la OP ligada (`7` Cancelado) y su etiqueta; `null` sin OP (EC-968). */
  op_estatus?: number | null;
  op_estatus_display?: string | null;
}

export interface PedidoDocumentoSalidaMaquila {
  id: number;
  folio: string;
  estatus: string;
  fecha_envio: string;
  fecha_recepcion: string | null;
  total_piezas: number | string;
  /**
   * Total del DOCUMENTO SM, que puede cubrir más de un pedido: nunca es un
   * importe de este pedido. `null` sin `R-PRODUCCION-COSTOS`. Sin moneda en la
   * respuesta: se pinta sin símbolo, como en la pantalla de SM.
   */
  total: number | string | null;
  centro_confeccion_nombre: string | null;
  op_folio: string | null;
  ob_folio: string | null;
  or_folio: string | null;
}

export interface PedidoDocumentoPicking {
  id: number;
  folio: string;
  /** Valor de `Picking.Estado` ("Pendiente", "Completado"…). */
  estado: string;
  /** NOMBRE del almacén donde están hoy las prendas (`Picking.almacen_actual`), no su id. */
  almacen_actual: string;
}

export interface PedidoDocumentoMovimiento {
  id: number;
  /** `ENTRADA`, `SALIDA`, `AJUSTE` o `TRANSFERENCIA`. */
  tipo_movimiento: string;
  fecha_movimiento: string | null;
  observaciones: string | null;
  /** Folio de la TR (sin su id): el detalle se abre por el `id` del movimiento. */
  transferencia_folio: string | null;
  origen: string | null;
  destino: string | null;
}

export interface PedidoDocumentoDespacho {
  id: number;
  guia: string;
  envio_id: number | null;
  packing_id: number;
  packing_folio: string;
  /**
   * `Despacho.estado` (nucleo-erp #1348): `"ACTIVO"` | `"CANCELADO"`. Opcional:
   * ausente en un backend anterior. Uno cancelado sigue en la lista, con su motivo.
   */
  estado?: string;
  /** `""` si no está cancelado. */
  motivo_cancelacion?: string;
  /**
   * Cuándo se entregó (nucleo-erp #1432); `null` sin entrega. Un despacho
   * entregado sigue `ACTIVO` pero ya no se cancela. Opcional: ausente en un
   * backend anterior.
   */
  fecha_entrega?: string | null;
}

/** `logistica.Envio`: el modelo no guarda más que el transportista (sin nombre en la respuesta). */
export interface PedidoDocumentoEnvio {
  id: number;
  transportista_id: number;
}

export interface PedidoDocumentoFactura {
  id: number;
  folio: string | null;
  estatus: string;
  fecha_emision: string | null;
  total: number | string;
  moneda_codigo: string | null;
}

/**
 * Aplicación de un cobro a UNA factura del pedido (`CobroDetalle`): un cobro
 * aplicado a dos facturas llega dos veces con el mismo `cobro_id`, distinto
 * `factura_folio`.
 */
export interface PedidoDocumentoCobro {
  cobro_id: number;
  importe_aplicado: number | string;
  folio: string | null;
  estatus: string;
  fecha: string | null;
  factura_folio: string | null;
  moneda_codigo: string | null;
}

export interface PedidoDocumentos {
  cotizaciones: PedidoDocumentoFila[];
  ordenes_compra: PedidoDocumentoFila[];
  pre_ordenes: PedidoDocumentoPreOrden[];
  ordenes_produccion: PedidoDocumentoFila[];
  ordenes_bordado: PedidoDocumentoFila[];
  ordenes_reflejante: PedidoDocumentoFila[];
  ordenes_corte_manga: PedidoDocumentoFila[];
  /** `null` sin `R-PRODUCCION-OP` (nucleo-erp #1304): el bloque no se muestra. */
  salidas_maquila: PedidoDocumentoSalidaMaquila[] | null;
  pickings: PedidoDocumentoPicking[];
  packings: PedidoDocumentoFila[];
  despachos: PedidoDocumentoDespacho[];
  envios: PedidoDocumentoEnvio[];
  movimientos_inventario: PedidoDocumentoMovimiento[];
  facturas: PedidoDocumentoFactura[] | null;
  cobros: PedidoDocumentoCobro[] | null;
}
