/**
 * Textos de las reglas de flete, seguros y anticipo, iguales a los del backend
 * (EC-571). Viven aparte de `utils/quoteAmounts` para que el schema los use sin
 * un ciclo de imports (`quoteAmounts` lee las etiquetas del schema de revisión).
 */

/** Flete, seguros o anticipo negativos. */
export const MONTO_NEGATIVO_MESSAGE = "Debe ser mayor o igual a 0";

export const ANTICIPO_MAYOR_AL_TOTAL_MESSAGE = "El anticipo no puede ser mayor al total";
