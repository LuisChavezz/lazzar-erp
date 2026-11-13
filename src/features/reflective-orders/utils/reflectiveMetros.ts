import { formatQuantityValue } from "@/src/utils/formatCurrency";

/**
 * Metros de reflejante de un renglón, como los muestran la página de detalle,
 * su diálogo y el PDF de la orden (una sola regla para los tres).
 *
 * `metros` es un `FloatField(default=0)`: cuando nadie lo captura llega `0`, no
 * `null`. Un "0" pintado como número se lee como una medición real ("esta orden
 * no lleva cinta"), que es falso — nadie lo calcula todavía. Se trata el cero
 * como AUSENCIA y se muestra con el mismo guion largo que los campos nulos.
 *
 * Se descartan también los valores no finitos, mismo criterio defensivo que
 * `computeReflectiveOrderKpis` con `cantidad`.
 */
export const reflectiveMetrosText = (metros: number): string =>
  Number.isFinite(metros) && metros !== 0 ? `${formatQuantityValue(metros)} m` : "—";
