/**
 * Horas como ENTEROS: centésimas de hora. Los decimales del backend
 * (`horas_trabajadas`, `horas_normales`, `horas_extra`,
 * `horas_base_diarias`) llegan como string y se convierten sin pasar por
 * `Number` con decimales, así que sumar y comparar no arrastra errores de
 * punto flotante.
 */

/** Milisegundos de una centésima de hora (36 s): la conversión es exacta. */
export const HUNDREDTH_HOUR_MS = 36_000;

const DECIMAL_PATTERN = /^\s*(-)?(\d+)(?:\.(\d+))?\s*$/;

/**
 * Decimal del backend ("8.50", "8", "-1.25") → centésimas de hora, o `null`
 * si no hay valor o no parsea. Un tercer decimal (no debería haberlo) se
 * redondea hacia arriba desde el 5.
 */
export const decimalToHundredths = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const match = DECIMAL_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const [, sign, whole, fraction = ""] = match;
  const digits = `${fraction}000`.slice(0, 3);
  let hundredths = Number(whole) * 100 + Number(digits.slice(0, 2));
  if (Number(digits[2]) >= 5) {
    hundredths += 1;
  }
  return sign ? -hundredths : hundredths;
};

/** Duración en ms → centésimas de hora (redondeo al más cercano). */
export const msToHundredths = (ms: number): number => Math.round(ms / HUNDREDTH_HOUR_MS);

/** Centésimas → "8.50". Con signo solo si es negativo. */
export const formatHundredths = (hundredths: number): string => {
  const absolute = Math.abs(hundredths);
  const text = `${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
  return hundredths < 0 ? `-${text}` : text;
};

/** Centésimas → "+1.50", "-0.25" o "0.00": para diferencias. */
export const formatSignedHundredths = (hundredths: number): string =>
  hundredths > 0 ? `+${formatHundredths(hundredths)}` : formatHundredths(hundredths);
