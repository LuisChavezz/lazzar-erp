import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import type { InvoiceEstatus } from "../interfaces/invoice.interface";

/**
 * Permiso que exige el backend en `POST /finanzas/facturas/{id}/timbrar/`
 * (sin él responde `403`). Es el MISMO que valida el servidor, no uno
 * parecido: ofrecer el botón con otro código lleva a un 403 al confirmar. La
 * compuerta real sigue siendo el backend; esta es de UX.
 */
export const INVOICE_STAMP_PERMISSION = "E-FIN-FACTURAS";

/** Única moneda que el backend timbra hoy (la factura no guarda tipo de cambio). */
export const INVOICE_STAMP_CURRENCY = "MXN";

/** Explicación del botón deshabilitado cuando la moneda no es MXN. */
export const INVOICE_STAMP_CURRENCY_MESSAGE =
  "Solo se pueden timbrar facturas en MXN: esta factura no puede timbrarse.";

/** ¿La factura ya tiene CFDI timbrado? */
export const isInvoiceStamped = (invoice: { cfdi_uuid?: string | null }): boolean =>
  Boolean(invoice.cfdi_uuid);

/**
 * Aviso para "Descargar PDF" y "Enviar correo" de una factura timbrada: el PDF
 * que genera el ERP no es la representación impresa del CFDI (no lleva folio
 * fiscal ni sello). Se rotula; no se oculta.
 */
export const INVOICE_NON_FISCAL_PDF_MESSAGE =
  "Este PDF no es el CFDI: no incluye folio fiscal ni sello digital.";

/** Etiqueta de "Descargar PDF" para una factura timbrada. */
export const INVOICE_NON_FISCAL_PDF_LABEL = "Descargar PDF (no fiscal)";

/**
 * ¿Se ofrece "Timbrar" para esta factura? Solo una `Emitida` ACTIVA y aún sin
 * CFDI. Decisión de producto: aunque el backend también timbra un `Borrador`,
 * aquí solo se ofrece para `Emitida`. `activo` desconocido (`undefined`) cuenta
 * como NO activa: ante la duda no se ofrece una acción irreversible.
 */
export const isInvoiceStampable = (invoice: {
  activo?: boolean;
  estatus: InvoiceEstatus | string;
  cfdi_uuid?: string | null;
}): boolean =>
  invoice.activo === true && invoice.estatus === INVOICE_STATUS.EMITIDA && !invoice.cfdi_uuid;

/**
 * ¿Se ofrece "Timbrar" a ESTE usuario para ESTA factura? Permiso del backend +
 * `isInvoiceStampable`. La moneda no entra aquí: una factura en otra moneda
 * muestra el botón deshabilitado con su explicación
 * (`isInvoiceStampCurrencySupported`).
 */
export const canStampInvoice = (
  invoice: Parameters<typeof isInvoiceStampable>[0],
  user: PermissionContext | null | undefined,
): boolean => hasPermission(INVOICE_STAMP_PERMISSION, user) && isInvoiceStampable(invoice);

/** ¿La moneda de la factura (`moneda_nombre`, el código ISO) se puede timbrar? */
export const isInvoiceStampCurrencySupported = (invoice: { moneda_nombre: string | null }): boolean =>
  (invoice.moneda_nombre ?? "").trim().toUpperCase() === INVOICE_STAMP_CURRENCY;

/**
 * Mensaje de un fallo de `timbrar/`. El backend pone el motivo bajo `cfdi`
 * (ya timbrada, datos fiscales faltantes, rechazo o falla de Facturama) o bajo
 * `estatus` (inactiva o cancelada), como string o como lista; `drfFieldMessage`
 * lee las dos formas. Si no viene ninguno (403, 404, 500, red), cae en el
 * extractor genérico.
 */
export const stampInvoiceErrorMessage = (error: unknown): string =>
  drfFieldMessage(error, "cfdi") ??
  drfFieldMessage(error, "estatus") ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo timbrar la factura.");
