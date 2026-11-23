import {
  getCxcInvoiceCfdiEligibility,
  type CxcInvoiceCfdiEligibility,
  type CxcInvoiceCfdiFields,
  type CxcInvoiceCfdiReasons,
} from "@/src/features/accounts-receivable/utils/cxcInvoiceCfdiEligibility";
import { relatedInvoiceLabel as invoiceLabel } from "./creditNoteStamping";

/** Cómo se nombra la factura delante del texto de la causa del backend (EC-938). */
const causeInvoiceLabel = (folio: string | null): string => (folio ? `Factura ${folio}` : "Factura relacionada");

const STAMP_PENDING_ACTION = "guarda la nota como borrador y emítela cuando se confirme.";

/** Textos de la nota de crédito para cada causa de `getCxcInvoiceCfdiEligibility`. */
const CREDIT_NOTE_REASONS: CxcInvoiceCfdiReasons = {
  // «Factura F-1: CFDI pendiente de timbrar. Guarda la nota como borrador…»
  withCauseLabel: (folio, causeLabel, kind) =>
    kind === "draftOnly"
      ? `${causeInvoiceLabel(folio)}: ${causeLabel}. ${STAMP_PENDING_ACTION.charAt(0).toUpperCase()}${STAMP_PENDING_ACTION.slice(1)}`
      : `${causeInvoiceLabel(folio)}: ${causeLabel}.`,
  cfdiCancelled: (folio) =>
    `${invoiceLabel(folio)} tiene su CFDI cancelado ante el SAT: no admite notas de crédito.`,
  cancellationRequested: (folio) =>
    `${invoiceLabel(folio)} tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite notas de crédito.`,
  stampPending: (folio) => `${invoiceLabel(folio)} tiene un timbrado pendiente de confirmación: ${STAMP_PENDING_ACTION}`,
};

/**
 * Qué admite la CxC de una factura como base de una nota de crédito nueva
 * (EC-560; desde EC-929 leído de la propia CxC y desde EC-938 con la causa
 * exacta del backend, `motivo_no_cobrable`, cuando la trae):
 *
 * - `blocked` (CxC o factura cancelada, CFDI cancelado, cancelación solicitada
 *   o en curso; sin `motivo_no_cobrable`, también `cobrable: false` sin causa
 *   expuesta): no se elige, ni para borrador.
 * - `draftOnly` (timbrado pendiente): se elige y la nota se guarda como
 *   borrador; emitirla lo bloquea el formulario con la factura fresca.
 * - `eligible`: se elige y se emite.
 *
 * Misma regla que los cobros (`getCxcInvoiceCfdiEligibility`), con los textos de
 * la nota.
 */
export const getCreditNoteCxcEligibility = (cuenta: CxcInvoiceCfdiFields): CxcInvoiceCfdiEligibility =>
  getCxcInvoiceCfdiEligibility(cuenta, CREDIT_NOTE_REASONS);

/** Motivo por el que la CxC no se puede ELEGIR en el selector de facturas, o `null`. */
export const getCreditNoteCxcSelectionBlockReason = (cuenta: CxcInvoiceCfdiFields): string | null => {
  const eligibility = getCreditNoteCxcEligibility(cuenta);
  return eligibility.kind === "blocked" ? eligibility.reason : null;
};
