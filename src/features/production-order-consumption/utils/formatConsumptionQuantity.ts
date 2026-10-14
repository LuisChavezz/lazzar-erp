import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { quantitySign } from "./consumptionQuantity";

/**
 * Cantidad de consumo para mostrar: 4 decimales de resolución
 * (`formatExactQuantityValue`, la misma de la habilitación y del inventario),
 * nunca redondeada a entero.
 */
export const formatConsumptionQuantity = (value: string): string =>
  formatExactQuantityValue(value);

/**
 * Diferencia con signo explícito: "+10", "-2.5", "0". El signo se lee del
 * string (no de un `number`), así que un "-0.0001" no se pierde.
 */
export const formatSignedConsumptionQuantity = (value: string): string =>
  `${quantitySign(value) > 0 ? "+" : ""}${formatExactQuantityValue(value)}`;
