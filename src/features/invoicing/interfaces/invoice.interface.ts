/**
 * Estatus de una factura (`Factura.FacturaStatus` del backend). Enum COMPLETO:
 * la facturación por piezas crea la factura en `Borrador`; `Emitida` solo la
 * crea hoy `registrar-pendiente-cobro` (por monto); ningún endpoint mueve una
 * factura fuera de `Borrador` (el timbrado está desconectado).
 */
export type InvoiceEstatus = "Borrador" | "Emitida" | "Cancelada";

export interface InvoiceDetail {
  id: number;
  factura: number;
  pedido_detalle: number;
  /**
   * Talla del pedido que factura este renglón. `null` en renglones anteriores a
   * la facturación por talla (y en facturas por monto, que no tienen renglones).
   */
  pedido_detalle_talla: number | null;
  producto: number;
  cantidad: string; // numeric string ("1.00")
  precio_unitario: string; // numeric string
  descuento: string; // numeric string
  /** Tasa aplicada al renglón ("16.00"); `null` en renglones anteriores. */
  porcentaje_impuesto: string | null;
  impuesto: string; // numeric string
  subtotal: string; // numeric string
  total: string; // numeric string
  producto_nombre: string;
  /** Nombre de la talla facturada; `null` en renglones anteriores. */
  talla_nombre: string | null;
}

export interface Invoice {
  id: number;
  activo: boolean;
  factura_detalles: InvoiceDetail[];
  moneda_nombre: string;
  cliente_nombre: string;
  /**
   * Correo al que se dirige la factura, resuelto server-side. Solo lo trae el
   * retrieve (`GET /finanzas/facturas/{id}/`); el listado no lo incluye.
   * Prioridad server-side: `pedido.correo_facturas` → `cliente.correo` → `null`.
   * Es `null` explícito (no cadena vacía) cuando no hay ninguna fuente de correo
   * disponible; validar presencia antes de habilitar el envío.
   */
  correo_facturas: string | null;
  empresa: number;
  sucursal: number;
  cliente: number;
  pedido: number;
  serie_folio: number;
  moneda: number;
  fecha_emision: string; // date string (yyyy-mm-dd)
  /** Fecha-calendario "yyyy-mm-dd"; `null` en las facturas creadas por piezas. */
  fecha_vencimiento: string | null;
  folio: string;
  subtotal: string; // numeric string
  descuento: string; // numeric string
  impuestos: string; // numeric string
  total: string; // numeric string
  estatus: InvoiceEstatus;
  observaciones: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

/**
 * Fila del listado ligero (`GET /finanzas/facturas/`, `FacturaListSerializer`):
 * un serializer PROPIO, distinto del retrieve. No trae `factura_detalles` ni
 * `correo_facturas` (el PDF y el correo piden el retrieve al activarse), ni
 * `empresa`, `sucursal`, `serie_folio`, `descuento`, `observaciones` o las
 * fechas de auditoría.
 *
 * `activo` es opcional: hoy no viene (el listado incluye eliminadas sin
 * distinguirlas); cuando venga, el menú oculta "Enviar correo" en las
 * eliminadas.
 */
export interface InvoiceListRow {
  id: number;
  folio: string | null;
  estatus: InvoiceEstatus;
  fecha_emision: string; // date string (yyyy-mm-dd)
  /** Fecha-calendario "yyyy-mm-dd"; `null` en las facturas creadas por piezas. */
  fecha_vencimiento: string | null;
  pedido: number | null;
  pedido_folio: string | null;
  cliente: number;
  cliente_nombre: string;
  /** Vendedor de la cotización del pedido. */
  vendedor: number | null;
  vendedor_nombre: string | null;
  /** Total de piezas facturadas. */
  cantidad: number;
  /** Precio por pieza sin IVA si todas comparten precio; `null` si varían o no hay renglones. */
  precio_unitario: string | null;
  subtotal: string; // numeric string
  impuestos: string; // numeric string
  total: string; // numeric string
  moneda: number;
  moneda_nombre: string;
  activo?: boolean;
}
