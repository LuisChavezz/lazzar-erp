import {
  CXC_NOT_COBRABLE_FALLBACK_REASON,
  getCxcInvoiceCfdiEligibility,
  type CxcInvoiceCfdiFields,
  type CxcInvoiceCfdiReasons,
} from "@/src/features/accounts-receivable/utils/cxcInvoiceCfdiEligibility";

/**
 * Qué admite una CxC según el estado del CFDI de su factura (EC-928), con la
 * causa exacta del backend cuando la trae (`motivo_no_cobrable`, EC-938):
 *
 * - `cobrable`: se elige y se aplica.
 * - `draftOnly`: timbrado pendiente de confirmación. Se elige y el cobro se
 *   guarda como borrador, pero no se aplica: el backend rechaza aplicarlo
 *   (`400 cobro_detalles`) y no valida un borrador.
 * - `blocked`: CxC o factura cancelada, o factura en cancelación. No se elige.
 *
 * La usan el selector de CxC, el formulario y el "Aplicar" del detalle de un
 * borrador, para que nunca se contradigan. La regla vive en
 * `getCxcInvoiceCfdiEligibility`, compartida con las notas de crédito (EC-929).
 */
export type CxcCobroEligibility =
  | { kind: "cobrable" }
  | { kind: "draftOnly"; reason: string }
  | { kind: "blocked"; reason: string };

/**
 * Dónde se muestra el motivo: el formulario del cobro (`form`), que todavía
 * puede guardarse como borrador, o el detalle de un borrador ya guardado
 * (`savedDraft`), donde solo falta aplicarlo. Solo cambia el texto del timbrado
 * pendiente.
 */
export type CxcEligibilityContext = "form" | "savedDraft";

export { CXC_NOT_COBRABLE_FALLBACK_REASON };

const invoiceLabel = (folio: string | null): string => (folio ? `La factura ${folio}` : "La factura");

/** Cómo se nombra la factura delante del texto de la causa del backend (EC-938). */
const causeInvoiceLabel = (folio: string | null): string => (folio ? `Factura ${folio}` : "Factura");

/** Qué hacer con un timbrado pendiente, según dónde se muestra. */
const stampPendingAction = (context: CxcEligibilityContext): string =>
  context === "savedDraft"
    ? "aplica el cobro cuando se confirme."
    : "guarda el cobro como borrador y aplícalo cuando se confirme.";

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Textos del cobro para cada causa de `getCxcInvoiceCfdiEligibility`. */
const cobroReasons = (context: CxcEligibilityContext): CxcInvoiceCfdiReasons => ({
  // «Factura F-1: CFDI pendiente de timbrar. Guarda el cobro como borrador…»
  withCauseLabel: (folio, causeLabel, kind) =>
    kind === "draftOnly"
      ? `${causeInvoiceLabel(folio)}: ${causeLabel}. ${capitalize(stampPendingAction(context))}`
      : `${causeInvoiceLabel(folio)}: ${causeLabel}.`,
  cfdiCancelled: (folio) => `${invoiceLabel(folio)} tiene su CFDI cancelado ante el SAT: no admite cobros.`,
  cancellationRequested: (folio) =>
    `${invoiceLabel(folio)} tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite cobros.`,
  stampPending: (folio) =>
    `${invoiceLabel(folio)} tiene un timbrado pendiente de confirmación: ${stampPendingAction(context)}`,
});

const COBRABLE: CxcCobroEligibility = { kind: "cobrable" };

/**
 * Elegibilidad de una CxC para un cobro: la regla compartida con las notas de
 * crédito (`getCxcInvoiceCfdiEligibility`, donde están la prioridad de causas y
 * el porqué del saldo) con los textos del cobro.
 */
export const getCxcCobroEligibility = (
  cuenta: CxcInvoiceCfdiFields,
  context: CxcEligibilityContext = "form",
): CxcCobroEligibility => {
  const eligibility = getCxcInvoiceCfdiEligibility(cuenta, cobroReasons(context));
  return eligibility.kind === "eligible" ? COBRABLE : eligibility;
};

/** Motivo por el que la CxC no se puede ELEGIR en el selector, o `null`. */
export const getCxcSelectionBlockReason = (
  cuenta: Parameters<typeof getCxcCobroEligibility>[0],
): string | null => {
  const eligibility = getCxcCobroEligibility(cuenta);
  return eligibility.kind === "blocked" ? eligibility.reason : null;
};

/** Motivo por el que la CxC impide APLICAR el cobro, o `null`. */
export const getCxcApplyBlockReason = (
  cuenta: Parameters<typeof getCxcCobroEligibility>[0],
  context: CxcEligibilityContext = "form",
): string | null => {
  const eligibility = getCxcCobroEligibility(cuenta, context);
  return eligibility.kind === "cobrable" ? null : eligibility.reason;
};

/**
 * Motivo para no aplicar un cobro con estas líneas, o `null`. `reasons` son los
 * de cada línea (`null` = aplicable): con una sola línea bloqueada, su motivo;
 * con varias, cuántas son (cada línea lleva el suyo).
 */
export const summarizeApplyBlockReasons = (reasons: readonly (string | null)[]): string | null => {
  const blocked = reasons.filter((reason): reason is string => reason !== null);
  if (blocked.length === 0) return null;
  if (blocked.length === 1) return blocked[0];
  return `${blocked.length} facturas del cobro no admiten aplicarlo: revisa el aviso de cada línea. Puedes guardarlo como borrador.`;
};
