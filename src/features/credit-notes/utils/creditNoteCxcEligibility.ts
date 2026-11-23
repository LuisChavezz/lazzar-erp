import {
  getCxcInvoiceCfdiEligibility,
  type CxcInvoiceCfdiEligibility,
  type CxcInvoiceCfdiFields,
  type CxcInvoiceCfdiReasons,
} from "@/src/features/accounts-receivable/utils/cxcInvoiceCfdiEligibility";
import { relatedInvoiceLabel as invoiceLabel } from "./creditNoteStamping";

/** Textos de la nota de crédito para cada causa de `getCxcInvoiceCfdiEligibility`. */
const CREDIT_NOTE_REASONS: CxcInvoiceCfdiReasons = {
  cfdiCancelled: (folio) =>
    `${invoiceLabel(folio)} tiene su CFDI cancelado ante el SAT: no admite notas de crédito.`,
  cancellationRequested: (folio) =>
    `${invoiceLabel(folio)} tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite notas de crédito.`,
  stampPending: (folio) =>
    `${invoiceLabel(folio)} tiene un timbrado pendiente de confirmación: guarda la nota como borrador y emítela cuando se confirme.`,
};

/**
 * Qué admite la CxC de una factura como base de una nota de crédito nueva
 * (EC-560, desde EC-929 leído de los campos del CFDI que trae la propia CxC):
 *
 * - `blocked` (CFDI cancelado, cancelación solicitada, o `cobrable: false` sin
 *   causa expuesta: factura cancelada o con su cancelación en curso): no se
 *   elige, ni para borrador.
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
