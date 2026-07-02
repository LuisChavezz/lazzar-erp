export interface InvoiceDetail {
  id: number;
  factura: number;
  pedido_detalle: number;
  producto: number;
  cantidad: string; // numeric string
  precio_unitario: string; // numeric string
  descuento: string; // numeric string
  impuesto: string; // numeric string
  subtotal: string; // numeric string
  total: string; // numeric string
  producto_nombre: string;
}

/**
 * Cuerpo del POST de creación de factura desde pedido
 * (`POST /finanzas/facturas/desde-pedido/`). **Solo** viaja `pedido`: el
 * servidor resuelve empresa, sucursal, cliente, moneda, folio, estatus y todo
 * el `factura_detalles` a partir del pedido. No se envía ningún otro campo.
 */
export interface CreateInvoiceFromOrderBody {
  pedido: number;
}

export interface Invoice {
  id: number;
  activo: boolean;
  factura_detalles: InvoiceDetail[];
  moneda_nombre: string;
  cliente_nombre: string;
  empresa: number;
  sucursal: number;
  cliente: number;
  pedido: number;
  serie_folio: number;
  moneda: number;
  fecha_emision: string; // date string (yyyy-mm-dd)
  fecha_vencimiento: string; // date string (yyyy-mm-dd)
  folio: string;
  subtotal: string; // numeric string
  descuento: string; // numeric string
  impuestos: string; // numeric string
  total: string; // numeric string
  estatus: string;
  observaciones: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}
