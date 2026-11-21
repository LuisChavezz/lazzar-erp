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
 * Pendiente EXACTO de un renglón del alta (el backend ya lo manda >= 0, con
 * hasta 4 decimales: "9.5000"). Es lo máximo que se puede recibir del renglón
 * y lo que mandan "Todo" y "Recibir todo" (EC-900): un pendiente fraccionario
 * (0.5 de una OP, una SM o un rechazo de Calidad) se recibe completo sin
 * teclearlo. 0 si no es un número o no es positivo.
 */
export const pendienteRecepcion = (cantidadPendiente: string): number => {
  const pendiente = Number(cantidadPendiente);
  return Number.isFinite(pendiente) && pendiente > 0 ? pendiente : 0;
};

/**
 * Techo de la captura MANUAL (teclear y "−"/"+"): el pendiente en piezas
 * enteras, porque `QuantitySelector` solo captura enteros. 10.5 → 10; 0.5 → 0
 * (ese renglón solo se recibe con "Todo").
 */
export const topeManualRecepcion = (pendiente: number): number => Math.max(0, Math.floor(pendiente));

/**
 * Cantidad que queda al capturar a mano `next` en un renglón que tiene
 * `actual` y cuyo pendiente exacto es `pendiente`. Hasta el tope manual se
 * toma tal cual; por encima se topa ahí, salvo que `actual` ya lo rebase (lo
 * fijó "Todo" con el pendiente fraccionario, p. ej. 10.5 con tope 10): entonces
 * se conserva, para que un "+" o un número de más no lo bajen.
 */
export const capturaManualRecepcion = (next: number, actual: number, pendiente: number): number => {
  const tope = topeManualRecepcion(pendiente);
  if (next <= tope) return next;
  return actual > tope ? actual : tope;
};

/**
 * Por qué un renglón no se puede recibir: "Sin pendiente" si no le queda nada.
 * `null` si se puede recibir, aunque lo pendiente sea menor a una pieza
 * (EC-900: se recibe con "Todo").
 */
export const motivoSinTope = (cantidadPendiente: string): "Sin pendiente" | null =>
  pendienteRecepcion(cantidadPendiente) > 0 ? null : "Sin pendiente";

/**
 * Suma cantidades en diezmilésimas enteras (la resolución de
 * `cantidad_recibida`), para que la aritmética de punto flotante no deje
 * residuos (0.1 + 0.2 ≠ 0.3) en totales, faltantes ni comparaciones. Acepta
 * negativos: `sumarCantidades([pendiente, -capturado])` es lo que falta.
 */
export const sumarCantidades = (valores: readonly number[]): number =>
  valores.reduce((sum, valor) => sum + Math.round(valor * ESCALA), 0) / ESCALA;

/**
 * Total de piezas recibidas de una recepción. Se suma en diezmilésimas enteras
 * para que la aritmética de punto flotante no deje residuos ("0.1" + "0.2");
 * un renglón que no sea número no suma.
 */
export const totalCantidadRecibida = (
  detalles: readonly Pick<ReceiptDetailLine, "cantidad_recibida">[],
): number =>
  sumarCantidades(
    detalles.flatMap((linea) => {
      const cantidad = Number.parseFloat(linea.cantidad_recibida);
      return Number.isNaN(cantidad) ? [] : [cantidad];
    }),
  );

/**
 * Cantidades capturadas que pasan del tope nuevo de su renglón, ya recortadas
 * (EC-919: tras releer el onboarding). El tope es el pendiente EXACTO (EC-900),
 * así que una captura de "Todo" que sigue cabiendo no cambia. Solo trae las que
 * cambian; las demás se conservan tal cual. Un renglón que ya no está en la
 * orden queda en "0".
 */
export const recortarCantidades = (
  cantidades: Record<string, string>,
  topes: ReadonlyMap<number, number>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(cantidades).flatMap(([key, valor]) => {
      const tope = topes.get(Number(key)) ?? 0;
      return (Number(valor) || 0) > tope ? [[key, String(tope)]] : [];
    }),
  );
