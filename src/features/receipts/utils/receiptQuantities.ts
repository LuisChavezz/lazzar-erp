import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { EMPTY_VALUE } from "@/src/utils/textOrDash";
import type { ReceiptDetailLine } from "../interfaces/receipt.interface";

/** Diezmilésimas por unidad: la resolución (4 decimales) de `cantidad_recibida`. */
const ESCALA = 10_000;

/**
 * Cantidad recibida ("12.5000") con su precisión completa —hasta 4 decimales,
 * los que mueve el inventario— y sin ceros sobrantes: "1.2345" → "1.2345",
 * "12.0000" → "12". "—" si falta o no es un número. La comparten el detalle en
 * pantalla (`ReceiptDetailShell`) y el PDF de la recepción, que deben decir lo
 * mismo (antes ambos redondeaban a 3 decimales).
 */
export const formatCantidadRecibida = (value: string | null | undefined): string => {
  if (!value?.trim()) return EMPTY_VALUE;
  return Number.isNaN(Number.parseFloat(value)) ? EMPTY_VALUE : formatExactQuantityValue(value);
};

/**
 * Total de piezas recibidas de una recepción. Se suma en diezmilésimas enteras
 * para que la aritmética de punto flotante no deje residuos ("0.1" + "0.2");
 * un renglón que no sea número no suma.
 */
export const totalCantidadRecibida = (
  detalles: readonly Pick<ReceiptDetailLine, "cantidad_recibida">[],
): number =>
  detalles.reduce((sum, linea) => {
    const cantidad = Number.parseFloat(linea.cantidad_recibida);
    return Number.isNaN(cantidad) ? sum : sum + Math.round(cantidad * ESCALA);
  }, 0) / ESCALA;
