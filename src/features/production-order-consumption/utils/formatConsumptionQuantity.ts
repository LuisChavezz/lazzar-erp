import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatScaledQuantity, parseQuantity, quantitySign } from "./consumptionQuantity";

/**
 * Cantidad de consumo del backend para mostrar: se interpreta con
 * `parseQuantity` (acepta más de 4 decimales y notación exponencial) y se
 * pinta con `formatExactQuantityValue`, a 4 decimales de resolución. Lo que no
 * se puede interpretar —o una cantidad ya marcada como no disponible (`null`)—
 * se muestra "—", nunca "0": `formatExactQuantityValue` solo convertiría el
 * texto malformado en un cero que parece real.
 */
export const formatBackendQuantity = (raw: string | null): string => {
  const value = parseQuantity(raw);
  return value === null ? "—" : formatExactQuantityValue(formatScaledQuantity(value));
};

/**
 * Como `formatBackendQuantity` pero con signo explícito: "+10", "-2.5", "0".
 * El signo se lee del valor interpretado (no de un `number`), así que un
 * "-0.0001" no se pierde.
 */
export const formatSignedBackendQuantity = (raw: string | null): string => {
  const value = parseQuantity(raw);
  if (value === null) return "—";
  return `${quantitySign(value) > 0 ? "+" : ""}${formatExactQuantityValue(formatScaledQuantity(value))}`;
};
