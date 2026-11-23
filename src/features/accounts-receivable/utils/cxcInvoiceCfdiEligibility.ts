import type { CuentaPorCobrar, MotivoNoCobrable } from "../interfaces/accounts-receivable.interface";

/**
 * Qué admite una CxC según el estado del CFDI de su factura (nucleo-erp#1187,
 * #1328). Regla ÚNICA para los documentos que se aplican sobre una CxC —cobros
 * (EC-928) y notas de crédito (EC-929)—; cada uno pone sus textos
 * (`CxcInvoiceCfdiReasons`):
 *
 * - `eligible`: se elige y se aplica.
 * - `draftOnly`: timbrado pendiente de confirmación (`CFDI_PENDIENTE`). Se
 *   elige y el documento se guarda como borrador, pero no se aplica/emite: el
 *   backend lo rechaza.
 * - `blocked`: CxC o factura cancelada, o factura en cancelación. No se elige,
 *   ni para borrador.
 */
export type CxcInvoiceCfdiEligibility =
  | { kind: "eligible" }
  | { kind: "draftOnly"; reason: string }
  | { kind: "blocked"; reason: string };

/** Campos de la CxC que decide la regla. */
export type CxcInvoiceCfdiFields = Pick<
  CuentaPorCobrar,
  | "factura_folio"
  | "estatus"
  | "saldo"
  | "cobrable"
  | "factura_cfdi_cancelado"
  | "factura_cfdi_cancelacion_solicitada"
  | "factura_cfdi_pendiente"
  | "motivo_no_cobrable"
  | "motivo_no_cobrable_display"
>;

/**
 * Textos de cada causa, por documento. `folio` es el de la factura (`null` si
 * la CxC no lo trae).
 *
 * - `withCauseLabel`: el motivo cuando la CxC trae el texto de su causa
 *   (`motivo_no_cobrable_display`, EC-938): el documento pone la factura y, en
 *   `draftOnly`, qué hacer; la causa es el texto del backend tal cual.
 * - El resto: los textos de la regla por campos del CFDI, para cuando la CxC
 *   no trae ese texto. El respaldo no lleva texto propio: es siempre
 *   `CXC_NOT_COBRABLE_FALLBACK_REASON`.
 */
export interface CxcInvoiceCfdiReasons {
  withCauseLabel: (folio: string | null, causeLabel: string, kind: "draftOnly" | "blocked") => string;
  cfdiCancelled: (folio: string | null) => string;
  cancellationRequested: (folio: string | null) => string;
  stampPending: (folio: string | null) => string;
}

/**
 * Respaldo cuando la CxC no admite el documento y no hay texto de la causa: la
 * CxC o la factura están `Cancelada`, o la cancelación de su CFDI está en
 * curso.
 */
export const CXC_NOT_COBRABLE_FALLBACK_REASON = "Factura cancelada o en proceso de cancelación";

const ELIGIBLE: CxcInvoiceCfdiEligibility = { kind: "eligible" };

/**
 * Qué decide cada motivo del backend. `SALDO_CERO` no bloquea aquí (`null`):
 * lo cubre la regla de saldo de cada documento, igual que en la regla por
 * campos.
 */
const KIND_BY_MOTIVO: Record<MotivoNoCobrable, "draftOnly" | "blocked" | null> = {
  CXC_CANCELADA: "blocked",
  FACTURA_CANCELADA: "blocked",
  CFDI_CANCELADO: "blocked",
  CANCELACION_SOLICITADA: "blocked",
  CANCELACION_EN_CURSO: "blocked",
  CFDI_PENDIENTE: "draftOnly",
  SALDO_CERO: null,
};

const isKnownMotivo = (value: unknown): value is MotivoNoCobrable =>
  typeof value === "string" && Object.hasOwn(KIND_BY_MOTIVO, value);

/** Texto de la regla por campos para un motivo cuya causa llegó sin texto. */
const fieldTextFor = (motivo: MotivoNoCobrable, folio: string | null, reasons: CxcInvoiceCfdiReasons): string => {
  switch (motivo) {
    case "CFDI_CANCELADO":
      return reasons.cfdiCancelled(folio);
    case "CANCELACION_SOLICITADA":
      return reasons.cancellationRequested(folio);
    case "CFDI_PENDIENTE":
      return reasons.stampPending(folio);
    default:
      return CXC_NOT_COBRABLE_FALLBACK_REASON;
  }
};

/**
 * Elegibilidad con el motivo del backend (EC-938): el código decide, aunque los
 * campos del CFDI digan otra cosa (los calcula el mismo backend en el orden de
 * `CuentaPorCobrar.motivo_no_cobrable`). El motivo es el texto de la causa con
 * la factura del documento; sin ese texto, el de la regla por campos.
 */
const eligibilityFromMotivo = (
  motivo: MotivoNoCobrable | null,
  cuenta: CxcInvoiceCfdiFields,
  reasons: CxcInvoiceCfdiReasons,
): CxcInvoiceCfdiEligibility => {
  const kind = motivo === null ? null : KIND_BY_MOTIVO[motivo];
  if (motivo === null || kind === null) return ELIGIBLE;
  const folio = cuenta.factura_folio || null;
  const causeLabel = cuenta.motivo_no_cobrable_display?.trim();
  const reason = causeLabel
    ? reasons.withCauseLabel(folio, causeLabel, kind)
    : fieldTextFor(motivo, folio, reasons);
  return { kind, reason };
};

/**
 * Elegibilidad con los campos del CFDI (nucleo-erp#1187), para una CxC sin
 * `motivo_no_cobrable`. Prioridad, de la causa más definitiva a la menos:
 * CFDI cancelado → cancelación solicitada → timbrado pendiente → CxC
 * `Cancelada` o `cobrable: false` sin causa expuesta (respaldo). Un CFDI
 * cancelado con el timbrado aún marcado pendiente es, ante todo, cancelado.
 *
 * El timbrado pendiente va ANTES del respaldo: el backend no deja cancelar una
 * factura con timbrado pendiente, así que `cobrable: false` +
 * `factura_cfdi_pendiente` es el pendiente, no otra causa oculta.
 *
 * El SALDO no se decide aquí: un saldo en 0 (CxC `Pagada`, o ya fuera del
 * listado de saldos pendientes) también da `cobrable: false`, pero lo cubre la
 * regla de saldo de cada documento; tratarlo como "cancelada" daría un motivo
 * falso. Sin los campos (respuesta vieja), la CxC es elegible, como antes de
 * nucleo-erp#1187: el backend sigue rechazando al aplicar.
 */
const eligibilityFromCfdiFields = (
  cuenta: CxcInvoiceCfdiFields,
  reasons: CxcInvoiceCfdiReasons,
): CxcInvoiceCfdiEligibility => {
  const folio = cuenta.factura_folio || null;
  if (cuenta.factura_cfdi_cancelado === true) {
    return { kind: "blocked", reason: reasons.cfdiCancelled(folio) };
  }
  if (cuenta.factura_cfdi_cancelacion_solicitada === true) {
    return { kind: "blocked", reason: reasons.cancellationRequested(folio) };
  }
  if (cuenta.factura_cfdi_pendiente === true) {
    return { kind: "draftOnly", reason: reasons.stampPending(folio) };
  }
  if (cuenta.estatus === "Cancelada") {
    return { kind: "blocked", reason: CXC_NOT_COBRABLE_FALLBACK_REASON };
  }
  if (cuenta.cobrable === false && cuenta.estatus !== "Pagada" && Number(cuenta.saldo) > 0) {
    return { kind: "blocked", reason: CXC_NOT_COBRABLE_FALLBACK_REASON };
  }
  return ELIGIBLE;
};

/**
 * Elegibilidad de una CxC. Con `motivo_no_cobrable` (EC-938) decide el motivo
 * del backend; sin él (respuesta vieja) o con un valor que este front no
 * conoce, los campos del CFDI, como antes.
 */
export const getCxcInvoiceCfdiEligibility = (
  cuenta: CxcInvoiceCfdiFields,
  reasons: CxcInvoiceCfdiReasons,
): CxcInvoiceCfdiEligibility => {
  const motivo = cuenta.motivo_no_cobrable;
  if (motivo === null || isKnownMotivo(motivo)) return eligibilityFromMotivo(motivo, cuenta, reasons);
  return eligibilityFromCfdiFields(cuenta, reasons);
};
