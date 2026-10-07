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
   * Correo al que se dirige la factura, resuelto server-side y expuesto
   * directamente por el serializer (mismo campo en el listado
   * `GET /finanzas/facturas/` y en el detalle `GET /finanzas/facturas/{id}/`).
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
