import { safeParseAmount } from "@/src/utils/formatCurrency";

/** "1 partida" / "3 partidas": la palabra según el conteo (1 → singular; 0 y más → plural). */
export const plural = (count: number, singular: string, pluralForm: string): string =>
  count === 1 ? singular : pluralForm;

/**
 * Como `plural`, pero para una cantidad que se muestra con `formatQuantityValue`
 * (redondeada a 2 decimales): decide con el MISMO valor que se ve, para que
 * "1.0040" o "0.996" —que se pintan como "1"— digan "1 pieza" y no "1 piezas".
 */
export const pluralForQuantity = (
  value: string | number,
  singular: string,
  pluralForm: string,
): string => plural(Math.round(safeParseAmount(String(value)) * 100) / 100, singular, pluralForm);
