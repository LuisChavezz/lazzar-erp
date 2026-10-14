/**
 * Aritmética de las cantidades de consumo, que el backend manda como string
 * decimal (`DecimalField(max_digits=18, decimal_places=4)`), con signo en los
 * registros de ajuste ("-10.0000").
 *
 * Se opera en ENTEROS escalados (diezmilésimas, como `bigint`) y nunca en
 * `number`: sumar "0.1000" + "0.2000" en coma flotante no da "0.3000", y 18
 * dígitos no caben en un `number` sin perder precisión. `BigInt(...)` y no
 * literales `10n`: el `target` del proyecto es ES2017.
 */

const SCALE_DIGITS = 4;
const SCALE = BigInt(10 ** SCALE_DIGITS);
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);

/**
 * Exponente máximo aceptado. Un `Decimal` del backend nunca se acerca; el tope
 * solo evita construir un `bigint` gigantesco con una entrada absurda
 * ("1E+99999"), que se trata como no interpretable.
 */
const MAX_EXPONENT = 1000;

/** Cantidad en diezmilésimas. */
export type ScaledQuantity = bigint;

/**
 * Decimal finito con signo opcional, decimales opcionales y notación
 * exponencial opcional: "8.0000", "8.00000000", "-0.5", ".5", "1E+1",
 * "1.5E-3". Es lo que puede producir `str(Decimal)` en Python.
 */
const DECIMAL_PATTERN = /^([+-])?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/;

/**
 * Cantidad del backend → diezmilésimas, o `null` si el texto no es un decimal
 * finito interpretable.
 *
 * Acepta más de 4 decimales y notación exponencial; lo que pase de 4
 * decimales se redondea a la mitad hacia afuera (`ROUND_HALF_UP` de Python,
 * el mismo con que el backend cuantiza). `null` y NUNCA 0 para lo que no se
 * entiende: un cero silencioso parecería un dato real.
 */
export const parseQuantity = (raw: string | null | undefined): ScaledQuantity | null => {
  const match = DECIMAL_PATTERN.exec((raw ?? "").trim());
  if (!match) return null;
  const [, sign, integer = "", fraction = "", bareFraction, exponentText = "0"] = match;
  const fractionDigits = bareFraction ?? fraction;
  const exponent = Number(exponentText);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > MAX_EXPONENT) return null;

  // valor = dígitos × 10^(exponente − decimales); en diezmilésimas se suma 4.
  const digits = BigInt(`${integer}${fractionDigits}` || "0");
  const shift = exponent - fractionDigits.length + SCALE_DIGITS;
  let magnitude: bigint;
  if (shift >= 0) {
    magnitude = digits * TEN ** BigInt(shift);
  } else {
    const divisor = TEN ** BigInt(-shift);
    magnitude = digits / divisor;
    // Mitad hacia afuera: se compara el resto contra la mitad del divisor.
    if ((digits % divisor) * BigInt(2) >= divisor) magnitude += ONE;
  }
  return sign === "-" ? -magnitude : magnitude;
};

/** 900000n → "90.0000" (siempre 4 decimales, signo solo si es negativo). */
export const formatScaledQuantity = (value: ScaledQuantity): string => {
  const negative = value < ZERO;
  const absolute = negative ? -value : value;
  const integer = (absolute / SCALE).toString();
  const fraction = (absolute % SCALE).toString().padStart(SCALE_DIGITS, "0");
  return `${negative ? "-" : ""}${integer}.${fraction}`;
};

/** Signo de una cantidad ya interpretada: -1, 0 o 1. */
export const quantitySign = (value: ScaledQuantity): -1 | 0 | 1 => {
  if (value === ZERO) return 0;
  return value < ZERO ? -1 : 1;
};
