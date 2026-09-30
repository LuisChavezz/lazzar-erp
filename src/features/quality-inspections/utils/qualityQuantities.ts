/**
 * Aritmética decimal EXACTA para las cantidades de Calidad.
 *
 * Dos precisiones conviven en el mismo renglón: `cantidad_recibida` llega con 4
 * decimales (`RecepcionDetalle`, `decimal_places=4`) y las cantidades de Calidad
 * se capturan con 2 (`CalidadInspeccionDetalle`, `decimal_places=2`). La regla
 * "aprobada + rechazada = recibida" es una IGUALDAD, así que no puede pasar por
 * `Number` y sus sumas binarias (0.1 + 0.2 ≠ 0.3): cada valor se convierte a un
 * entero de diezmilésimas a partir de su TEXTO y se compara como entero.
 */

/** Diezmilésimas: la precisión más fina que interviene (la de `cantidad_recibida`). */
export const QUANTITY_SCALE_PLACES = 4;

/** Decimales que acepta Calidad por cantidad. */
export const QUALITY_DECIMAL_PLACES = 2;

/**
 * Cantidad de Calidad capturada: hasta 8 enteros y 2 decimales
 * (`DecimalField(max_digits=10, decimal_places=2)` en el backend).
 */
export const QUALITY_QUANTITY_REGEX = /^\d{1,8}(\.\d{1,2})?$/;

/** Unidades de diezmilésima por unidad de Calidad (1 centésima = 100 diezmilésimas). */
const UNITS_PER_QUALITY_STEP = 10 ** (QUANTITY_SCALE_PLACES - QUALITY_DECIMAL_PLACES);

/**
 * Decimal no negativo en texto → entero de diezmilésimas, o `null` si el texto
 * no es un decimal de hasta 4 posiciones o el resultado deja de ser exacto en
 * `Number`. `"1000.0000"` → 10000000; `"0.5"` → 5000.
 */
export function toScaledUnits(value: string): number | null {
  const match = /^(\d+)(?:\.(\d*))?$/.exec(value.trim());
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > QUANTITY_SCALE_PLACES) return null;
  const units = Number(match[1] + fraction.padEnd(QUANTITY_SCALE_PLACES, "0"));
  return Number.isSafeInteger(units) ? units : null;
}

/**
 * ¿Se puede repartir `cantidad_recibida` en dos cantidades de 2 decimales?
 * Solo si no trae nada más allá de la centésima ("10.5000" sí, "10.1234" no).
 */
export function isSplittableIntoQualitySteps(units: number): boolean {
  return units % UNITS_PER_QUALITY_STEP === 0;
}

/** Entero de diezmilésimas → texto de 2 decimales, para mensajes y el autollenado. */
export function unitsToQualityString(units: number): string {
  const steps = Math.trunc(units / UNITS_PER_QUALITY_STEP);
  const integer = Math.trunc(steps / 100);
  const cents = String(steps % 100).padStart(2, "0");
  return `${integer}.${cents}`;
}

/**
 * Cantidad del backend para MOSTRAR: sin ceros de relleno a la derecha
 * ("1000.0000" → "1,000"; "12.5000" → "12.5"), sin redondear nunca.
 */
export function formatQuantity(value: string): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return value;
  const integer = Number(match[1]).toLocaleString("es-MX");
  const fraction = (match[2] ?? "").replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer;
}
