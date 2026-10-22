/**
 * Estatus de una factura (`Factura.FacturaStatus` del backend). Enum COMPLETO:
 * la facturación por piezas crea la factura en `Borrador` y
 * `registrar-pendiente-cobro` (por monto) la crea ya `Emitida`.
 * `POST /finanzas/facturas/{id}/emitir/` pasa una `Borrador` a `Emitida` (crea
 * su CxC y su póliza) y `POST /finanzas/facturas/{id}/cancelar/` lleva una
 * `Borrador` o una `Emitida` a `Cancelada`.
 *
 * El timbrado del CFDI (`POST /finanzas/facturas/{id}/timbrar/`) NO es un
 * estatus: no cambia `estatus`, solo llena `cfdi_uuid`, `facturama_id` y
 * `cfdi_fecha_timbrado`.
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
  /**
   * Folio fiscal del CFDI; `null` mientras no se timbre. Solo lo escribe
   * `POST /finanzas/facturas/{id}/timbrar/` (solo lectura en la API). Cancelar
   * la factura cancela su CFDI ante el SAT (motivo 02) pero NO limpia este campo.
   */
  cfdi_uuid: string | null;
  /** Id del CFDI en Facturama; `null` mientras no se timbre. */
  facturama_id: string | null;
  /** Fecha y hora del timbrado (ISO con zona); `null` mientras no se timbre. */
  cfdi_fecha_timbrado: string | null;
  /**
   * Timbrado SIN CONFIRMAR: Facturama no confirmó el timbrado (timeout, red,
   * 5xx o respuesta sin UUID) y pudo generarse un CFDI. Mientras siga en
   * `true`, `timbrar/` lo rechaza; solo un administrador lo desmarca. Lo trae
   * el retrieve y el listado (no el desglose).
   */
  cfdi_pendiente: boolean;
  /**
   * CFDI ya cancelado ante el SAT. `cancelar/` lo guarda ANTES y aparte de la
   * cancelación en el ERP: si esa parte falla, la factura sigue `Emitida` con
   * este campo en `true` y reintentar solo completa la parte del ERP (no
   * vuelve a llamar al SAT). Lo trae el retrieve y el listado (no el
   * desglose).
   */
  cfdi_cancelado: boolean;
  /**
   * Cancelación del CFDI SOLICITADA ante el SAT y pendiente de que el receptor
   * la acepte. `cancelar/` lo guarda en su propia transacción cuando Facturama
   * responde `requested`, aunque responda `400` (`cancelacion_pendiente`); la
   * factura no cambia de `estatus`. Lo apaga un `canceled` posterior. Lo trae
   * el retrieve y el listado (no el desglose).
   */
  cfdi_cancelacion_solicitada: boolean;
}

/**
 * Fila del listado ligero (`GET /finanzas/facturas/`, `FacturaListSerializer`):
 * un serializer PROPIO, distinto del retrieve. No trae `factura_detalles` ni
 * `correo_facturas` (el PDF y el correo piden el retrieve al activarse), ni
 * `empresa`, `sucursal`, `serie_folio`, `descuento`, `observaciones` o las
 * fechas de auditoría.
 *
 * `activo`: el listado incluye las eliminadas y las distingue con este campo
 * (`FacturaListSerializer` lo expone). Sigue tipado opcional: quien lo use
 * para ofrecer una acción irreversible debe exigir `activo === true`, nunca
 * `!== false` (ver `isInvoiceCancellable`).
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
  /**
   * Folio fiscal del CFDI; `null` mientras no se timbre. `facturama_id` y
   * `cfdi_fecha_timbrado` solo vienen en el retrieve.
   */
  cfdi_uuid: string | null;
  /** Mismos flags del CFDI que el retrieve (ver `Invoice`). */
  cfdi_cancelacion_solicitada: boolean;
  cfdi_cancelado: boolean;
  cfdi_pendiente: boolean;
}

/**
 * Respuesta de `POST /finanzas/facturas/{id}/cancelar/`: la factura completa
 * (`FacturaSerializer`, como el retrieve) más la contrapóliza del día, `null`
 * si no hubo (Borrador, ya cancelada o sin póliza). NO trae ningún dato de
 * inventario: un 200 no dice si regresaron piezas a existencia.
 */
export interface InvoiceCancelResponse extends Invoice {
  contrapoliza_id: number | null;
}

/**
 * Respuesta de `POST /finanzas/facturas/{id}/enviar-cfdi/`: la dirección a la
 * que el backend mandó el PDF y el XML oficiales del CFDI.
 */
export interface InvoiceCfdiEmailResponse {
  enviado_a: string;
}
