/**
 * Reglas de los cargos de cotización/pedido (flete, seguros y anticipo),
 * con los mismos textos que el backend (EC-571).
 */
import { decimalToCents } from "@/src/features/orders/utils/orderAccounting";
import { ANTICIPO_MAYOR_AL_TOTAL_MESSAGE, MONTO_NEGATIVO_MESSAGE } from "../constants/montos";
import { QUOTE_REVIEW_FIELD_LABELS } from "../schemas/quote-review.schema";

export { ANTICIPO_MAYOR_AL_TOTAL_MESSAGE, MONTO_NEGATIVO_MESSAGE };

/**
 * Lo que aporta un cargo capturado (flete, seguros, anticipo) a los totales EN
 * VIVO: un valor negativo o no numérico es inválido —el campo ya muestra su
 * error— y cuenta 0, para que el total y el saldo nunca se calculen con él
 * (EC-563, CO-07).
 */
export const nonNegativeAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

/**
 * Centavos de un importe —número del formulario o string de la API— para
 * comparar sin ruido de punto flotante. Lo que no es un decimal cuenta 0, igual
 * que `nonNegativeAmount`.
 */
const toCents = (value: unknown) =>
  decimalToCents(typeof value === "number" || typeof value === "string" ? String(value) : null) ?? 0;

/**
 * ¿El anticipo supera el total? Se compara a 2 decimales, la precisión con la
 * que ambos viajan al backend. Lo usan la regla en vivo del formulario, la
 * validación previa a revisión y la autorización.
 */
export const isAnticipoMayorAlTotal = (anticipo: unknown, granTotal: unknown) =>
  toCents(anticipo) > toCents(granTotal);

/**
 * Primer error de los cargos GUARDADOS de un documento, o `null`. Mismas reglas
 * y orden que `errores_montos` del backend: cada cargo no negativo y, si el
 * anticipo no es negativo, anticipo ≤ gran total.
 */
export const getSavedMontosError = (documento: {
  anticipo: string | number | null;
  flete: string | number | null;
  seguros: string | number | null;
  gran_total: string | number | null;
}): string | null => {
  for (const campo of ["anticipo", "flete", "seguros"] as const) {
    if ((Number(documento[campo]) || 0) < 0) {
      return `${QUOTE_REVIEW_FIELD_LABELS[campo]}: ${MONTO_NEGATIVO_MESSAGE}`;
    }
  }
  return isAnticipoMayorAlTotal(documento.anticipo, documento.gran_total)
    ? ANTICIPO_MAYOR_AL_TOTAL_MESSAGE
    : null;
};
