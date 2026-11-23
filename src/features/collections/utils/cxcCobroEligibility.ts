import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";

/**
 * Qué admite una CxC según el estado del CFDI de su factura (EC-928):
 *
 * - `cobrable`: se elige y se aplica.
 * - `draftOnly`: timbrado pendiente de confirmación. Se elige y el cobro se
 *   guarda como borrador, pero no se aplica: el backend rechaza aplicarlo
 *   (`400 cobro_detalles`) y no valida un borrador.
 * - `blocked`: factura cancelada o en cancelación. No se elige.
 *
 * Es la ÚNICA regla: la usan el selector de CxC, el formulario y el "Aplicar"
 * del detalle de un borrador, para que nunca se contradigan.
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

/** Respaldo cuando `cobrable` es `false` y ningún campo dice por qué. */
export const CXC_NOT_COBRABLE_FALLBACK_REASON = "Factura cancelada o en proceso de cancelación";

const invoiceLabel = (folio: string | null | undefined): string =>
  folio ? `La factura ${folio}` : "La factura";

const COBRABLE: CxcCobroEligibility = { kind: "cobrable" };

/**
 * Elegibilidad de una CxC para un cobro. Prioridad, de la causa más definitiva
 * a la menos: CFDI cancelado → cancelación solicitada → timbrado pendiente →
 * CxC `Cancelada` o `cobrable: false` sin causa expuesta (respaldo). Un CFDI
 * cancelado con el timbrado aún marcado pendiente es, ante todo, cancelado.
 *
 * El timbrado pendiente va ANTES del respaldo: el backend no deja cancelar una
 * factura con timbrado pendiente, así que `cobrable: false` +
 * `factura_cfdi_pendiente` es el pendiente, no otra causa oculta.
 *
 * El SALDO no se decide aquí: un saldo en 0 (CxC `Pagada`, o ya fuera del
 * listado de saldos pendientes) también da `cobrable: false`, pero lo cubre la
 * regla de saldo del formulario y del detalle; tratarlo como "cancelada" daría
 * un motivo falso. Sin los campos (respuesta vieja), la CxC es cobrable, como
 * antes de EC-928: el backend sigue rechazando al aplicar.
 */
export const getCxcCobroEligibility = (
  cuenta: Pick<
    CuentaPorCobrar,
    | "factura_folio"
    | "estatus"
    | "saldo"
    | "cobrable"
    | "factura_cfdi_cancelado"
    | "factura_cfdi_cancelacion_solicitada"
    | "factura_cfdi_pendiente"
  >,
  context: CxcEligibilityContext = "form",
): CxcCobroEligibility => {
  const label = invoiceLabel(cuenta.factura_folio);
  if (cuenta.factura_cfdi_cancelado === true) {
    return { kind: "blocked", reason: `${label} tiene su CFDI cancelado ante el SAT: no admite cobros.` };
  }
  if (cuenta.factura_cfdi_cancelacion_solicitada === true) {
    return {
      kind: "blocked",
      reason: `${label} tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite cobros.`,
    };
  }
  if (cuenta.factura_cfdi_pendiente === true) {
    return {
      kind: "draftOnly",
      reason:
        context === "savedDraft"
          ? `${label} tiene un timbrado pendiente de confirmación: aplica el cobro cuando se confirme.`
          : `${label} tiene un timbrado pendiente de confirmación: guarda el cobro como borrador y aplícalo cuando se confirme.`,
    };
  }
  if (cuenta.estatus === "Cancelada") {
    return { kind: "blocked", reason: CXC_NOT_COBRABLE_FALLBACK_REASON };
  }
  if (cuenta.cobrable === false && cuenta.estatus !== "Pagada" && Number(cuenta.saldo) > 0) {
    return { kind: "blocked", reason: CXC_NOT_COBRABLE_FALLBACK_REASON };
  }
  return COBRABLE;
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
