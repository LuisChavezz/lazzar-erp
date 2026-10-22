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
 * ¿El PDF del ERP debe rotularse como no fiscal? Si la factura ya tiene CFDI
 * (`cfdi_uuid`) o pudo tenerlo (`cfdi_pendiente`: timbrado sin confirmar), el
 * PDF que genera el ERP no es el comprobante fiscal. Fuente única para la
 * cabecera del detalle y el menú del listado (que no trae `cfdi_pendiente`).
 */
export const isInvoicePdfNonFiscal = (invoice: {
  cfdi_uuid?: string | null;
  cfdi_pendiente?: boolean;
}): boolean => isInvoiceStamped(invoice) || invoice.cfdi_pendiente === true;

/**
 * Aviso para "Descargar PDF" y "Enviar correo" de una factura timbrada o con
 * timbrado pendiente: el PDF
 * que genera el ERP no es la representación impresa del CFDI (no lleva folio
 * fiscal ni sello). Se rotula; no se oculta.
 */
export const INVOICE_NON_FISCAL_PDF_MESSAGE =
  "Este PDF no es el CFDI: no incluye folio fiscal ni sello digital.";

/** Etiqueta de "Descargar PDF" para una factura timbrada. */
export const INVOICE_NON_FISCAL_PDF_LABEL = "Descargar PDF (no fiscal)";

/**
 * Etiqueta de "Enviar correo": fuente única para la cabecera del detalle y el
 * menú del listado. En una factura timbrada (`nonFiscal`) se rotula "no
 * fiscal": adjunta el mismo PDF del ERP, y el CFDI oficial se manda con
 * "Enviar CFDI". `noRecipient` agrega "sin correo". Los calificativos van
 * juntos en un solo paréntesis: "Enviar correo (no fiscal, sin correo)".
 */
export const invoiceEmailLabel = ({
  nonFiscal,
  noRecipient = false,
}: {
  nonFiscal: boolean;
  noRecipient?: boolean;
}): string => {
  const qualifiers = [nonFiscal && "no fiscal", noRecipient && "sin correo"].filter(Boolean);
  return qualifiers.length ? `Enviar correo (${qualifiers.join(", ")})` : "Enviar correo";
};

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

/**
 * ¿Hay un timbrado SIN CONFIRMAR? El backend marca `cfdi_pendiente` cuando
 * Facturama no confirmó el timbrado (timeout, red, 5xx o respuesta sin UUID):
 * puede existir un CFDI vigente ante el SAT aunque la factura no tenga
 * `cfdi_uuid`. Mientras siga marcado, `timbrar/` lo rechaza y solo un
 * administrador lo desmarca. Solo viene en el retrieve, no en el listado.
 */
export const isInvoiceStampPending = (invoice: { cfdi_pendiente?: boolean }): boolean =>
  invoice.cfdi_pendiente === true;

/** Explicación de "Timbrar" bloqueado mientras el timbrado está pendiente de confirmación. */
export const INVOICE_STAMP_PENDING_MESSAGE =
  "Timbrado pendiente de confirmación con Facturama. Contacta a un administrador para revisarlo.";

/** Indicador de la cabecera, en el lugar del bloque del folio fiscal. */
export const INVOICE_STAMP_PENDING_LABEL = "Timbrado pendiente de confirmación";

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
