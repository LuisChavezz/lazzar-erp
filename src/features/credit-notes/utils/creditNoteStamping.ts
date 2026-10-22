import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { INVOICE_STAMP_PERMISSION } from "@/src/features/invoicing/utils/invoiceStamping";
import { isInvoiceCfdiCancelled } from "@/src/features/invoicing/utils/invoiceCancellation";
import { INVOICE_STATUS } from "@/src/features/invoicing/constants/invoiceStatus";
import type { NotaCredito } from "../interfaces/credit-note.interface";

/** ¿La nota ya tiene CFDI de egreso timbrado? */
export const isCreditNoteStamped = (nota: Pick<NotaCredito, "cfdi_uuid">): boolean =>
  Boolean(nota.cfdi_uuid);

/**
 * ¿Hay un timbrado SIN CONFIRMAR? Facturama no confirmó el timbrado y pudo
 * generarse un CFDI vigente ante el SAT aunque la nota no tenga `cfdi_uuid`.
 * Mientras siga marcado, `timbrar/` lo rechaza y solo un administrador lo
 * desmarca.
 */
export const isCreditNoteStampPending = (nota: Pick<NotaCredito, "cfdi_pendiente">): boolean =>
  nota.cfdi_pendiente === true;

/**
 * ¿Se ofrece "Timbrar" para esta nota? Solo una `Emitida` sin CFDI y sin
 * timbrado pendiente. Desde el PR #607 emitir ya timbra antes de guardar, así
 * que esto es el camino de recuperación para las `Emitida` que quedaron sin
 * timbre. Un `Borrador` no se ofrece: se timbra al emitirlo.
 */
export const isCreditNoteStampable = (
  nota: Pick<NotaCredito, "estatus" | "cfdi_uuid" | "cfdi_pendiente">,
): boolean =>
  nota.estatus === "Emitida" && !isCreditNoteStamped(nota) && !isCreditNoteStampPending(nota);

/**
 * ¿Se ofrece "Timbrar" a ESTE usuario para ESTA nota? `isCreditNoteStampable`
 * más el permiso de `timbrar/`, que en el backend es el MISMO que el de la
 * factura (`PERMISO_CANCELAR_FACTURA`, `E-FIN-FACTURAS`).
 */
export const canStampCreditNote = (
  nota: Parameters<typeof isCreditNoteStampable>[0],
  user: PermissionContext | null | undefined,
): boolean => hasPermission(INVOICE_STAMP_PERMISSION, user) && isCreditNoteStampable(nota);

/**
 * Motivo por el que NO se puede emitir ni timbrar una nota sobre esta factura,
 * o `null`. Una factura `Cancelada`, o con su CFDI ya cancelado ante el SAT
 * (`cfdi_cancelado`), no admite notas: el backend no lo valida (#614) y
 * reabriría su CxC o relacionaría el egreso con un CFDI cancelado.
 */
export const getRelatedInvoiceCancelledReason = (invoice: {
  folio: string | null;
  estatus: string;
  cfdi_cancelado?: boolean;
}): string | null => {
  const label = invoice.folio ? `La factura ${invoice.folio}` : "La factura relacionada";
  if (invoice.estatus === INVOICE_STATUS.CANCELADA) {
    return `${label} está cancelada: no admite notas de crédito.`;
  }
  if (isInvoiceCfdiCancelled(invoice)) {
    return `${label} tiene su CFDI cancelado ante el SAT: no admite notas de crédito.`;
  }
  return null;
};

/** Estado de la factura relacionada, tal como lo conoce el detalle de la nota. */
export type RelatedInvoiceStampState =
  | { status: "loading" }
  | { status: "unavailable" }
  | {
      status: "loaded";
      invoice: {
        folio: string | null;
        cfdi_uuid: string | null;
        estatus: string;
        cfdi_cancelado?: boolean;
      };
    };

/**
 * Motivo por el que "Timbrar" se muestra BLOQUEADO, o `null` si se puede
 * timbrar. El backend exige que la factura relacionada ya esté timbrada (el
 * CFDI de egreso se relaciona con su UUID); mientras no se sepa —cargando o sin
 * poder consultarla— tampoco se ofrece la acción. Una factura cancelada, o con
 * su CFDI cancelado ante el SAT, se bloquea antes que nada
 * (`getRelatedInvoiceCancelledReason`): el backend timbraría igual (#614).
 */
export const getCreditNoteStampBlockReason = (invoice: RelatedInvoiceStampState): string | null => {
  if (invoice.status === "loading") return "Consultando si la factura relacionada está timbrada…";
  if (invoice.status === "unavailable") {
    return "No se pudo consultar la factura relacionada: no se puede confirmar que esté timbrada.";
  }
  const cancelledReason = getRelatedInvoiceCancelledReason(invoice.invoice);
  if (cancelledReason) return cancelledReason;
  if (!invoice.invoice.cfdi_uuid) {
    const { folio } = invoice.invoice;
    const label = folio ? `La factura ${folio}` : "La factura relacionada";
    return `${label} no está timbrada. Timbra primero la factura para poder timbrar esta nota.`;
  }
  return null;
};

/** Mensaje de un timbrado pendiente de confirmación (toast y nota visible). */
export const CREDIT_NOTE_STAMP_PENDING_MESSAGE =
  "Timbrado pendiente de confirmación con Facturama. Contacta a un administrador para revisarlo.";

/** Indicador del detalle, en el lugar del folio fiscal. */
export const CREDIT_NOTE_STAMP_PENDING_LABEL = "Timbrado pendiente de confirmación";

/**
 * Motivo por el que "Cancelar nota" se muestra BLOQUEADO, o `null` si se
 * puede cancelar. El backend no cancela ante el SAT el CFDI de una nota:
 * `cancelar/` devolvería el importe a la cuenta por cobrar y dejaría el CFDI de
 * egreso vigente. Con el timbrado pendiente pudo existir ese CFDI, así que
 * también se bloquea.
 */
export const getCreditNoteCancelBlockReason = (
  nota: Pick<NotaCredito, "cfdi_uuid" | "cfdi_pendiente">,
): string | null => {
  if (isCreditNoteStamped(nota)) {
    return "Esta nota ya está timbrada y su CFDI aún no puede cancelarse ante el SAT: cancelarla en el ERP lo dejaría vigente.";
  }
  if (isCreditNoteStampPending(nota)) {
    return "Tiene un timbrado pendiente de confirmación: no se puede cancelar hasta que un administrador lo revise.";
  }
  return null;
};

/**
 * Aviso de la emisión: desde el PR #607 el backend timbra el CFDI de egreso
 * ANTES de guardar la nota `Emitida`, y si el timbrado falla no guarda nada.
 */
export const CREDIT_NOTE_EMIT_STAMP_WARNING =
  "Al emitirla se timbrará su CFDI de egreso ante el SAT. Es un acto fiscal irreversible: una vez timbrado, el CFDI no puede cancelarse desde el ERP. Si el timbrado falla, la nota no se emite.";
