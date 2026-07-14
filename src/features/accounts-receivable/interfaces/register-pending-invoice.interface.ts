// Contrato del endpoint para registrar manualmente una factura pendiente por
// cobrar (`POST /finanzas/facturas/registrar-pendiente-cobro/`). El backend crea
// la Factura y, en la misma operación, su Cuenta por Cobrar asociada.
//
// Las llaves conservan el nombre español del contrato del backend — no traducir.
// `empresa` y `sucursal` NO forman parte del cuerpo: el servidor los resuelve a
// partir del usuario autenticado.

export interface RegisterPendingInvoiceBody {
  cliente: number;
  moneda: number;
  /** FK opcional; `null` cuando no se vincula a un pedido. */
  pedido: number | null;
  /** Opcional; si se omite/vacío, el backend lo autogenera. */
  folio?: string;
  /** Opcional, ISO `YYYY-MM-DD`. */
  fecha_vencimiento?: string;
  subtotal: string;
  descuento: string;
  impuestos: string;
  total: string;
  referencia?: string;
  observaciones?: string;
}

/** Factura devuelta en la respuesta 201. */
export interface RegisterPendingInvoiceFactura {
  id: number;
  folio: string;
  estatus: string;
  cliente: number;
  moneda: number;
  pedido: number | null;
  subtotal: string;
  descuento: string;
  impuestos: string;
  total: string;
  fecha_vencimiento: string | null;
}

/** Cuenta por Cobrar creada junto con la factura. */
export interface RegisterPendingInvoiceCuentaPorCobrar {
  id: number;
  estatus: string;
  saldo: string;
  referencia: string;
  fecha_vencimiento: string | null;
}

/** Respuesta 201 completa del endpoint. */
export interface RegisterPendingInvoiceResponse {
  factura: RegisterPendingInvoiceFactura;
  cuenta_por_cobrar: RegisterPendingInvoiceCuentaPorCobrar;
}
