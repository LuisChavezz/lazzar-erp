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
 * ¿La cantidad capturada en el alta de recepción cuenta como recibida? Es la
 * ÚNICA regla para eso: la usan el schema del formulario ("al menos una") y el
 * armado del payload (`reduceDetalle`, que descarta las demás), así que "el
 * formulario pasa" y "el POST lleva renglones" no pueden divergir (EC-893).
 */
export const tieneCantidadRecibida = (value: string | undefined): boolean =>
  value !== undefined && value.trim() !== "" && Number(value) > 0;

/**
 * Techo de captura de un renglón del alta: lo pendiente (el backend ya lo
 * manda >= 0) en piezas enteras, porque el selector solo captura enteros
 * (decimales: EC-900). Un pendiente menor a 1 da 0: el renglón no se puede
 * recibir desde la pantalla.
 */
export const topeRecepcion = (cantidadPendiente: string): number =>
  Math.max(0, Math.floor(Number(cantidadPendiente) || 0));

/**
 * Por qué un renglón no se puede recibir (techo 0): "Sin pendiente" si no le
 * queda nada y "Pendiente fraccionario" si le queda menos de una pieza.
 * `null` si se puede recibir. Se deriva del mismo techo que topa la captura.
 */
export const motivoSinTope = (
  cantidadPendiente: string,
): "Sin pendiente" | "Pendiente fraccionario" | null => {
  if (topeRecepcion(cantidadPendiente) >= 1) return null;
  return (Number(cantidadPendiente) || 0) > 0 ? "Pendiente fraccionario" : "Sin pendiente";
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
