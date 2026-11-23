import type { CuentaPorCobrar } from "../interfaces/accounts-receivable.interface";

/**
 * Qué admite una CxC según el estado del CFDI de su factura (nucleo-erp#1187).
 * Regla ÚNICA para los documentos que se aplican sobre una CxC —cobros (EC-928)
 * y notas de crédito (EC-929)—; cada uno pone sus textos
 * (`CxcInvoiceCfdiReasons`):
 *
 * - `eligible`: se elige y se aplica.
 * - `draftOnly`: timbrado pendiente de confirmación (`factura_cfdi_pendiente`).
 *   Se elige y el documento se guarda como borrador, pero no se aplica/emite:
 *   el backend lo rechaza.
 * - `blocked`: factura cancelada o en cancelación. No se elige, ni para borrador.
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
>;

/**
 * Textos de cada causa, por documento. `folio` es el de la factura (`null` si
 * la CxC no lo trae). El respaldo no lleva texto propio: es siempre
 * `CXC_NOT_COBRABLE_FALLBACK_REASON`.
 */
export interface CxcInvoiceCfdiReasons {
  cfdiCancelled: (folio: string | null) => string;
  cancellationRequested: (folio: string | null) => string;
  stampPending: (folio: string | null) => string;
}

/**
 * Respaldo cuando `cobrable` es `false` y ningún campo dice por qué: la factura
 * está `Cancelada` o su cancelación está en curso
 * (`cfdi_cancelacion_en_curso_desde`), que no tienen campo propio en la CxC.
 */
export const CXC_NOT_COBRABLE_FALLBACK_REASON = "Factura cancelada o en proceso de cancelación";

const ELIGIBLE: CxcInvoiceCfdiEligibility = { kind: "eligible" };

/**
 * Elegibilidad de una CxC. Prioridad, de la causa más definitiva a la menos:
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
export const getCxcInvoiceCfdiEligibility = (
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
