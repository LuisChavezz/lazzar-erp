/**
 * Reglas de los cargos de cotización/pedido (flete, seguros y anticipo),
 * con los mismos textos que el backend (EC-571).
 */

/** Flete, seguros o anticipo negativos. */
export const MONTO_NEGATIVO_MESSAGE = "Debe ser mayor o igual a 0";

export const ANTICIPO_MAYOR_AL_TOTAL_MESSAGE = "El anticipo no puede ser mayor al total";

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

/** Centavos de un importe, para comparar sin ruido de punto flotante. */
const toCents = (value: unknown) => Math.round((Number(value) || 0) * 100);

/**
 * ¿El anticipo supera el total? Se compara a 2 decimales, la precisión con la
 * que ambos viajan al backend. Lo usan la regla en vivo del formulario, la
 * validación previa a revisión y la autorización.
 */
export const isAnticipoMayorAlTotal = (anticipo: unknown, granTotal: unknown) =>
  toCents(anticipo) > toCents(granTotal);

const MONTO_LABELS = { anticipo: "Anticipo", flete: "Flete", seguros: "Seguros" } as const;

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
      return `${MONTO_LABELS[campo]}: ${MONTO_NEGATIVO_MESSAGE}`;
    }
  }
  return isAnticipoMayorAlTotal(documento.anticipo, documento.gran_total)
    ? ANTICIPO_MAYOR_AL_TOTAL_MESSAGE
    : null;
};
