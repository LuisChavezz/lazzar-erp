// ── Contrato del API ────────────────────────────────────────────────────────
// `GET /ventas/stock-digital/` y `GET /ventas/stock-digital/{variante_id}/`
// (nucleo-erp #1415). Nombres de campo EXACTOS del backend, verificados contra
// `ventas/api/stock_digital.py` y `ventas/services/stock_digital.py`.
//
// Las cantidades llegan como NÚMERO JSON con decimales (hasta 4): el backend
// arma un `Response` con `Decimal` y el encoder de DRF los pasa a `float`.
// Las fechas "calendario" (`proxima_entrada`, `entrega_*`,
// `fecha_entrega_estimada`) llegan como `YYYY-MM-DD`; `fecha_confirmacion` es
// un datetime en UTC.

/** Cifras de un SKU. El front las pinta tal cual: no las recalcula. */
export interface StockDigitalTotales {
  /** Piezas en ALM-00 (el almacén de surtido), nunca en otros almacenes. */
  existencia_real: number;
  comprometido: number;
  en_produccion: number;
  en_compra: number;
  disponible_hoy: number;
  /** Negativa = faltante. */
  disponible_digital: number;
  /** `YYYY-MM-DD`; `null` si ninguna OP/OC abierta tiene fecha estimada. */
  proxima_entrada: string | null;
}

/** Fila del listado: un SKU (variante de catálogo). */
export interface StockDigitalFila extends StockDigitalTotales {
  variante_id: number;
  sku: string;
  /** Ya viene compuesto ("Playera - Negro - M"); puede ser "". */
  nombre: string;
  producto_id: number;
  producto_nombre: string;
  categoria_id: number | null;
  categoria_nombre: string | null;
  color_id: number;
  color: string;
  talla_id: number | null;
  talla: string | null;
  /** `variante.activo && producto.activo`. En el listado por defecto siempre `true`. */
  activo: boolean;
}

/** Existencia de un ALM-00 (uno por sucursal): `almacen` es el CÓDIGO. */
export interface StockDigitalExistencia {
  almacen_id: number;
  almacen: string;
  sucursal_id: number | null;
  sucursal: string | null;
  cantidad: number;
}

/** Pedido que compromete el SKU (Autorizado o En proceso, con pendiente > 0). */
export interface StockDigitalCompromiso {
  pedido_id: number;
  folio: string | null;
  cliente_nombre: string | null;
  vendedor: string | null;
  sucursal_id: number;
  estatus: number;
  /** Texto del backend tal cual (en mayúsculas, p. ej. "AUTORIZADA"). */
  estatus_display: string;
  clasificacion: string | null;
  retenido: boolean;
  /** Datetime UTC (`...Z`). */
  fecha_confirmacion: string | null;
  /** `YYYY-MM-DD`; `null` sin clasificación (o clasificación X). */
  entrega_desde: string | null;
  entrega_hasta: string | null;
  pedida: number;
  surtida: number;
  pendiente: number;
}

/** OP abierta que traerá piezas del SKU. */
export interface StockDigitalEntradaProduccion {
  op_id: number;
  folio: string | null;
  sucursal_id: number;
  estatus: number;
  /** Texto del backend tal cual (sin acentos, p. ej. "En produccion"). */
  estatus_display: string;
  pedido_folio: string | null;
  fecha_entrega_estimada: string | null;
  cantidad: number;
  recibido: number;
  pendiente: number;
}

/** OC abierta (Autorizada o Parcialmente recibida) que traerá piezas del SKU. */
export interface StockDigitalEntradaCompra {
  orden_compra_id: number;
  folio: string | null;
  sucursal_id: number;
  proveedor: string | null;
  estatus: number;
  estatus_display: string;
  fecha_entrega_estimada: string | null;
  cantidad: number;
  recibido: number;
  pendiente: number;
}

/** Detalle de un SKU: la misma fila y de dónde sale cada cifra. */
export interface StockDigitalDetalle extends StockDigitalFila {
  existencias: StockDigitalExistencia[];
  compromisos: StockDigitalCompromiso[];
  entradas_produccion: StockDigitalEntradaProduccion[];
  entradas_compra: StockDigitalEntradaCompra[];
}
