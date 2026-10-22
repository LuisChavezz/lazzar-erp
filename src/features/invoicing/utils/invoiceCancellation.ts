import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import type { InvoiceEstatus } from "../interfaces/invoice.interface";
import { isInvoiceStamped } from "./invoiceStamping";

/**
 * Permiso que exige el backend en `POST /finanzas/facturas/{id}/cancelar/`
 * (sin él responde `403`). Es el MISMO que valida el servidor: ofrecer la
 * acción con otro código lleva a un 403 al confirmar. La compuerta real sigue
 * siendo el backend; esta es de UX.
 */
export const INVOICE_CANCEL_PERMISSION = "E-FIN-FACTURAS";

/** Estatus desde los que el backend permite cancelar (conjunto explícito). */
const CANCELLABLE_STATUSES: readonly string[] = [INVOICE_STATUS.BORRADOR, INVOICE_STATUS.EMITIDA];

/**
 * ¿Se ofrece "Cancelar factura" para esta factura? Solo si está ACTIVA y en un
 * estatus cancelable. `activo` desconocido (`undefined`) cuenta como NO activa:
 * ante la duda no se ofrece una acción irreversible.
 */
export const isInvoiceCancellable = (invoice: {
  activo?: boolean;
  estatus: InvoiceEstatus | string;
}): boolean => invoice.activo === true && CANCELLABLE_STATUSES.includes(invoice.estatus);

/**
 * ¿Se ofrece "Cancelar factura" a ESTE usuario para ESTA factura? Fuente ÚNICA
 * de la regla para el menú del listado y la cabecera del detalle: permiso
 * (`INVOICE_CANCEL_PERMISSION`) + `isInvoiceCancellable`.
 */
export const canCancelInvoice = (
  invoice: Parameters<typeof isInvoiceCancellable>[0],
  user: PermissionContext | null | undefined,
): boolean => hasPermission(INVOICE_CANCEL_PERMISSION, user) && isInvoiceCancellable(invoice);

/**
 * Explicación de "Cancelar factura" deshabilitado con un timbrado sin
 * confirmar (`cfdi_pendiente`): puede haber un CFDI vigente ante el SAT que
 * `cancelar/` no cancelaría, porque la factura no tiene `cfdi_uuid` (y el
 * backend no lo rechaza).
 */
export const INVOICE_CANCEL_BLOCKED_BY_PENDING_STAMP_MESSAGE =
  "No se puede cancelar mientras el timbrado está pendiente de confirmación.";

/**
 * Motivo por el que "Cancelar factura" está BLOQUEADO, o `null` si no lo está.
 * Solo el timbrado sin confirmar (`cfdi_pendiente`) lo bloquea: una factura
 * timbrada SÍ se cancela (`cancelar/` cancela antes su CFDI ante el SAT).
 * Fuente única para la cabecera del detalle, el menú del listado y el precheck
 * de `useCancelInvoice`. El menú del listado no lo evalúa: lo frena el
 * precheck con el retrieve fresco.
 */
export const getInvoiceCancelBlockReason = (invoice: {
  cfdi_pendiente?: boolean;
}): string | null =>
  invoice.cfdi_pendiente === true ? INVOICE_CANCEL_BLOCKED_BY_PENDING_STAMP_MESSAGE : null;

/**
 * ¿El CFDI ya está cancelado ante el SAT? `cancelar/` lo guarda aparte, antes
 * de cancelar en el ERP. Viene en el retrieve y en el listado.
 */
export const isInvoiceCfdiCancelled = (invoice: { cfdi_cancelado?: boolean }): boolean =>
  invoice.cfdi_cancelado === true;

/**
 * ¿La cancelación del CFDI está SOLICITADA y esperando a que el receptor la
 * acepte ante el SAT? `cfdi_cancelacion_solicitada` sin `cfdi_cancelado` (un
 * CFDI ya cancelado no espera nada). Sirve la fila del listado y el retrieve.
 */
export const isInvoiceCfdiCancellationRequested = (invoice: {
  cfdi_cancelacion_solicitada?: boolean;
  cfdi_cancelado?: boolean;
}): boolean => invoice.cfdi_cancelacion_solicitada === true && !isInvoiceCfdiCancelled(invoice);

/** Indicador de la cabecera del detalle y de la fila del listado. */
export const INVOICE_CFDI_CANCELLATION_REQUESTED_LABEL = "Cancelación pendiente de aceptar";

/** Explicación del indicador (nota de la cabecera y `title` en el listado). */
export const INVOICE_CFDI_CANCELLATION_REQUESTED_HINT =
  "Se solicitó cancelar el CFDI ante el SAT; falta que el receptor la acepte.";

/**
 * Aviso del diálogo cuando la cancelación ya está solicitada: confirmar vuelve
 * a pedirla ante el SAT, y la factura solo se cancela si ya fue aceptada.
 */
export const INVOICE_CANCEL_ALREADY_REQUESTED_MESSAGE =
  "La cancelación del CFDI ya se solicitó y está pendiente de que el receptor la acepte. Si confirmas, se volverá a consultar al SAT: la factura solo se cancelará si el receptor ya la aceptó.";

/** Aviso del diálogo: timbrada y con el CFDI aún vigente, `cancelar/` llama primero al SAT. */
export const INVOICE_CANCEL_SAT_FIRST_MESSAGE =
  "Primero se cancelará el CFDI ante el SAT con motivo 02 (comprobante emitido con errores sin relación). Si el SAT no lo cancela, la factura no cambia.";

/** Aviso del diálogo: el SAT ya canceló el CFDI, falta la parte del ERP (no se vuelve a llamar al SAT). */
export const INVOICE_CANCEL_ERP_ONLY_MESSAGE =
  "El CFDI ya está cancelado ante el SAT; solo falta cancelar la factura en el ERP.";

/**
 * Aviso del diálogo de cancelación según el CFDI, o `null` sin CFDI. Si a la
 * fila le faltara `cfdi_cancelado`, una timbrada muestra el de "primero el
 * SAT": el backend igual se salta el SAT si ya estaba cancelado.
 */
export const getInvoiceCancelCfdiNotice = (invoice: {
  cfdi_uuid?: string | null;
  cfdi_cancelado?: boolean;
}): string | null => {
  if (!isInvoiceStamped(invoice)) return null;
  return isInvoiceCfdiCancelled(invoice)
    ? INVOICE_CANCEL_ERP_ONLY_MESSAGE
    : INVOICE_CANCEL_SAT_FIRST_MESSAGE;
};

/** Estado del CFDI en la cabecera del detalle cuando `cfdi_cancelado`. */
export const INVOICE_CFDI_CANCELLED_LABEL = "Cancelado ante el SAT";

/** Nota de la cabecera: CFDI cancelado ante el SAT pero la factura sigue `Emitida`. */
export const INVOICE_CFDI_CANCELLED_ERP_PENDING_MESSAGE =
  "La factura sigue Emitida: falta cancelarla en el ERP.";

/**
 * Estado del CFDI en la cabecera de una factura `Cancelada` con `cfdi_uuid` y
 * SIN `cfdi_cancelado` (p. ej. cancelada antes de que `cancelar/` cancelara el
 * CFDI ante el SAT): el CFDI sigue vigente y el ERP no ofrece cómo cancelarlo.
 */
export const INVOICE_CFDI_VALID_LABEL = "Vigente ante el SAT";

/** Nota de la cabecera para ese caso. */
export const INVOICE_CFDI_VALID_AFTER_ERP_CANCEL_MESSAGE =
  "La factura se canceló en el ERP, pero su CFDI no se canceló ante el SAT.";

/**
 * Mensaje de un fallo de `cancelar/`. El backend pone el motivo bajo `cfdi`
 * (el SAT o Facturama no cancelaron el CFDI, o no respondieron) o bajo
 * `estatus` (notas de crédito emitidas), como string o como lista;
 * `drfFieldMessage` lee las dos formas. Ninguno de esos `400` guarda nada. El
 * caso en que el receptor debe aceptar llega bajo `cancelacion_pendiente` y no
 * es un fallo: `useCancelInvoice` lo separa antes
 * (`cancelacionPendienteMessage`); aunque llega como `400`, el backend SÍ
 * guardó `cfdi_cancelacion_solicitada`. El mensaje se muestra tal cual, sin
 * distinguir casos por su texto. Si no viene ninguno (403, 404, 500, red), cae
 * en el extractor genérico.
 */
export const cancelInvoiceErrorMessage = (error: unknown): string =>
  drfFieldMessage(error, "cfdi") ??
  drfFieldMessage(error, "estatus") ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo cancelar la factura.");
