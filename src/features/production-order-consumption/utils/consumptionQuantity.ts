/**
 * Aritmética de las cantidades de consumo, que el backend manda como string
 * decimal con 4 decimales (`DecimalField(max_digits=18, decimal_places=4)`),
 * con signo en los registros de ajuste ("-10.0000").
 *
 * Se opera en ENTEROS escalados (diezmilésimas, como `bigint`) y nunca en
 * `number`: sumar "0.1000" + "0.2000" en coma flotante no da "0.3000", y 18
 * dígitos no caben en un `number` sin perder precisión. `BigInt(...)` y no
 * literales `10n`: el `target` del proyecto es ES2017.
 */

const SCALE_DIGITS = 4;
const SCALE = BigInt(10 ** SCALE_DIGITS);
const ZERO = BigInt(0);

/** Cantidad en diezmilésimas. */
export type ScaledQuantity = bigint;

const QUANTITY_PATTERN = /^(-)?(\d+)(?:\.(\d{1,4}))?$/;

/**
 * "90.0000" → 900000n. Acepta hasta 4 decimales y signo negativo. Un valor que
 * no tiene esa forma se toma como 0 —mismo criterio que `safeParseAmount`—:
 * el contrato garantiza el formato, y una página que se cae por un renglón
 * malformado sería peor que un cero visible.
 */
export const parseQuantity = (raw: string | null | undefined): ScaledQuantity => {
  const match = QUANTITY_PATTERN.exec((raw ?? "").trim());
  if (!match) return ZERO;
  const [, minus, integer, fraction = ""] = match;
  const value = BigInt(integer) * SCALE + BigInt(fraction.padEnd(SCALE_DIGITS, "0"));
  return minus ? -value : value;
};

/** 900000n → "90.0000" (siempre 4 decimales, signo solo si es negativo). */
export const formatScaledQuantity = (value: ScaledQuantity): string => {
  const negative = value < ZERO;
  const absolute = negative ? -value : value;
  const integer = (absolute / SCALE).toString();
  const fraction = (absolute % SCALE).toString().padStart(SCALE_DIGITS, "0");
  return `${negative ? "-" : ""}${integer}.${fraction}`;
};

/** Signo de una cantidad decimal del backend: -1, 0 o 1. */
export const quantitySign = (raw: string | null | undefined): -1 | 0 | 1 => {
  const value = parseQuantity(raw);
  if (value === ZERO) return 0;
  return value < ZERO ? -1 : 1;
};
