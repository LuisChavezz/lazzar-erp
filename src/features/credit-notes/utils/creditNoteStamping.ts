import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { INVOICE_STAMP_PERMISSION } from "@/src/features/invoicing/utils/invoiceStamping";
import {
  isInvoiceCfdiCancellationRequested,
  isInvoiceCfdiCancelled,
} from "@/src/features/invoicing/utils/invoiceCancellation";
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
 * timbrado pendiente. Emitir ya timbra (y desde nucleo-erp #732 ya no deja una
 * nota emitida sin CFDI por una factura sin timbrar: lo rechaza sin guardar),
 * así que esto es el camino de recuperación para las `Emitida` sin timbre que
 * quedaron de antes o cuyo timbrado pendiente un administrador liberó. Un
 * `Borrador` no se ofrece: se timbra al emitirlo.
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
 * ¿Puede ESTE usuario emitir notas de crédito? Emitir timbra el CFDI de egreso,
 * y el backend le exige el mismo permiso que a `timbrar/` (`E-FIN-FACTURAS`,
 * #725): sin él responde `403` sin guardar nada. Misma regla que
 * `canStampCreditNote`, rol "admin" incluido. El backend solo lo exige en la
 * empresa dueña de la cuenta de Facturama, que el front no conoce: en otra
 * empresa esto bloquea de más, igual que "Timbrar".
 */
export const canEmitCreditNote = (user: PermissionContext | null | undefined): boolean =>
  hasPermission(INVOICE_STAMP_PERMISSION, user);

/** Por qué "Emitir" está bloqueado cuando `canEmitCreditNote` es `false`. */
export const CREDIT_NOTE_EMIT_PERMISSION_REASON =
  "No tienes permiso para emitir notas de crédito: si la empresa timbra con Facturama, emitir intenta timbrar su CFDI y requiere el permiso de facturación.";

const relatedInvoiceLabel = (folio: string | null): string =>
  folio ? `La factura ${folio}` : "La factura relacionada";

/**
 * Motivo por el que NO se puede emitir ni timbrar una nota sobre esta factura,
 * o `null`. Una factura `Cancelada`, con su CFDI ya cancelado ante el SAT
 * (`cfdi_cancelado`) o con su cancelación solicitada y pendiente de que el
 * receptor la acepte (`cfdi_cancelacion_solicitada`), no admite notas: el
 * backend las rechaza con `400` en `factura` (`validar_factura`, #614) y aquí
 * se avisa antes de intentarlo.
 */
export const getRelatedInvoiceCancelledReason = (invoice: {
  folio: string | null;
  estatus: string;
  cfdi_cancelado?: boolean;
  cfdi_cancelacion_solicitada?: boolean;
}): string | null => {
  const label = relatedInvoiceLabel(invoice.folio);
  if (invoice.estatus === INVOICE_STATUS.CANCELADA) {
    return `${label} está cancelada: no admite notas de crédito.`;
  }
  if (isInvoiceCfdiCancelled(invoice)) {
    return `${label} tiene su CFDI cancelado ante el SAT: no admite notas de crédito.`;
  }
  if (isInvoiceCfdiCancellationRequested(invoice)) {
    return `${label} tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite notas de crédito.`;
  }
  return null;
};

/**
 * Motivo por el que NO se puede EMITIR una nota sobre esta factura —alta como
 * `Emitida` o "Emitir" de un borrador—, o `null`. Suma a
 * `getRelatedInvoiceCancelledReason` el timbrado sin confirmar de la factura
 * (`cfdi_pendiente`): sin UUID, el backend rechaza el CFDI de la nota con un
 * `400` en `cfdi` SIN `nota_credito`, que el formulario de alta trata como
 * "pudo quedar registrada" y bloquea. Decirlo antes evita ese bloqueo. Un
 * borrador sí se puede guardar sobre ella.
 */
export const getRelatedInvoiceEmitBlockReason = (
  invoice: Parameters<typeof getRelatedInvoiceCancelledReason>[0] & {
    activo?: boolean;
    cfdi_pendiente?: boolean;
  },
): string | null => {
  // Eliminada (baja lógica): el backend NO lo valida al emitir (ver
  // `getInvoiceEmitPrecheckReason`). Solo un `false` explícito bloquea.
  if (invoice.activo === false) return getInvoiceNotCreditableReason(invoice.folio, invoice);
  const cancelledReason = getRelatedInvoiceCancelledReason(invoice);
  if (cancelledReason) return cancelledReason;
  if (invoice.cfdi_pendiente === true) return invoiceStampPendingReason(invoice.folio);
  return null;
};

const invoiceStampPendingReason = (folio: string | null): string =>
  `${relatedInvoiceLabel(folio)} tiene un timbrado pendiente de confirmación: guarda la nota como borrador y emítela cuando se confirme.`;

/**
 * Motivo para DETENER "Emitir" de un borrador antes del PATCH, con la factura
 * FRESCA (`undefined` si respondió `404`), o `null`. Deliberadamente estrecho:
 * solo lo que el backend no rechaza bien.
 *
 * - Eliminada (`activo` distinto de `true`) o inexistente: `validar_factura` no
 *   mira `activo`, así que el backend aplicaría el crédito y timbraría un CFDI
 *   relacionado a una factura borrada. PROVISIONAL hasta que el backend lo
 *   valide (nucleo-erp #736).
 * - Timbrado pendiente (`cfdi_pendiente`): el backend lo rechaza sin guardar
 *   nada, pero con un `cfdi` que no dice en qué quedó la nota; aquí se da el
 *   motivo exacto.
 *
 * Una factura cancelada o en cancelación no se detiene aquí: el backend la
 * rechaza atómicamente con un `400` en `factura` que ya dice el motivo.
 */
export const getInvoiceEmitPrecheckReason = (
  folio: string | null,
  invoice:
    | (Parameters<typeof getRelatedInvoiceCancelledReason>[0] & {
        activo?: boolean;
        cfdi_pendiente?: boolean;
      })
    | undefined,
): string | null => {
  if (!invoice || invoice.activo !== true) return getInvoiceNotCreditableReason(folio, invoice);
  if (invoice.cfdi_pendiente === true) return invoiceStampPendingReason(invoice.folio);
  return null;
};

/**
 * Aviso (no bloqueo) para emitir sobre una factura sin `cfdi_uuid`, o `null`.
 * En la empresa que timbra con Facturama el backend rechaza esa emisión sin
 * guardar nada; en otra empresa las facturas nunca tienen UUID y la emisión
 * procede. El front no sabe cuál es, así que solo avisa.
 */
export const getInvoiceUnstampedEmitWarning = (invoice: {
  folio: string | null;
  cfdi_uuid?: string | null;
}): string | null =>
  invoice.cfdi_uuid
    ? null
    : `${relatedInvoiceLabel(invoice.folio)} aún no está timbrada. Si la empresa timbra con Facturama, la emisión se rechazará sin registrar nada hasta que se timbre la factura.`;

/**
 * Motivo por el que una factura NO admite notas de crédito nuevas, ni siquiera
 * como borrador, o `null`. `invoice` es la factura tal como la devuelve el
 * listado o el retrieve; `undefined` si no figura en el listado. Sin ella, o
 * eliminada (`activo` distinto de `true`), no se puede confirmar su estado y
 * se trata como no acreditable; si no, aplica `getRelatedInvoiceCancelledReason`.
 */
export const getInvoiceNotCreditableReason = (
  folio: string | null,
  invoice: (Parameters<typeof getRelatedInvoiceCancelledReason>[0] & { activo?: boolean }) | undefined,
): string | null => {
  if (!invoice || invoice.activo !== true) {
    return `${relatedInvoiceLabel(folio)} no está disponible: no admite notas de crédito.`;
  }
  return getRelatedInvoiceCancelledReason(invoice);
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
        cfdi_cancelacion_solicitada?: boolean;
      };
    };

/**
 * Motivo por el que "Timbrar" se muestra BLOQUEADO, o `null` si se puede
 * timbrar. El backend exige que la factura relacionada ya esté timbrada (el
 * CFDI de egreso se relaciona con su UUID); mientras no se sepa —cargando o sin
 * poder consultarla— tampoco se ofrece la acción. Una factura cancelada, con
 * su CFDI cancelado ante el SAT o con su cancelación pendiente de aceptar, se
 * bloquea antes que nada (`getRelatedInvoiceCancelledReason`): el backend la
 * rechazaría (#614).
 */
export const getCreditNoteStampBlockReason = (invoice: RelatedInvoiceStampState): string | null => {
  if (invoice.status === "loading") return "Consultando si la factura relacionada está timbrada…";
  if (invoice.status === "unavailable") {
    return "No se pudo consultar la factura relacionada: no se puede confirmar que esté timbrada.";
  }
  const cancelledReason = getRelatedInvoiceCancelledReason(invoice.invoice);
  if (cancelledReason) return cancelledReason;
  if (!invoice.invoice.cfdi_uuid) {
    return `${relatedInvoiceLabel(invoice.invoice.folio)} no está timbrada. Timbra primero la factura para poder timbrar esta nota.`;
  }
  return null;
};

/** Mensaje de un timbrado pendiente de confirmación (toast y nota visible). */
export const CREDIT_NOTE_STAMP_PENDING_MESSAGE =
  "Timbrado pendiente de confirmación con Facturama. Contacta a un administrador para revisarlo.";

/** Indicador del detalle, en el lugar del folio fiscal. */
export const CREDIT_NOTE_STAMP_PENDING_LABEL = "Timbrado pendiente de confirmación";

/** Texto bajo el indicador: lo que sigue, sin repetir el rótulo. */
export const CREDIT_NOTE_STAMP_PENDING_HINT =
  "Facturama no lo confirmó. Contacta a un administrador para revisarlo.";

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
 * Aviso de la emisión, según nucleo-erp #732. Solo en la empresa dueña de la
 * cuenta de Facturama el backend timbra: valida el CFDI dentro de la
 * transacción que aplica la nota a la cuenta por cobrar (factura sin timbrar o
 * datos fiscales faltantes: no se guarda nada) y DESPUÉS timbra. Si Facturama
 * rechaza, la emisión se revierte con el saldo intacto (un alta queda
 * `Cancelada`, un borrador vuelve a `Borrador`); si no confirma, la nota queda
 * emitida con el timbrado pendiente. En otra empresa solo se aplica la nota. El
 * front no sabe cuál es la empresa de Facturama, así que todo va condicionado.
 */
export const CREDIT_NOTE_EMIT_STAMP_WARNING =
  "Si la empresa timbra con Facturama, al emitirla se intentará timbrar su CFDI de egreso ante el SAT, y para eso la factura debe estar timbrada. Es un acto fiscal irreversible: una vez timbrado, el CFDI no puede cancelarse desde el ERP. Si Facturama rechaza el timbrado, la emisión se revierte y el saldo por cobrar no cambia; si no lo confirma, la nota queda emitida con el timbrado pendiente de confirmación.";
