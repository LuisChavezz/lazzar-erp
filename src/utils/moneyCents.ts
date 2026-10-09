import { formatCurrency } from "./formatCurrency";

/**
 * Dinero en CENTAVOS ENTEROS. La API serializa los decimales como string
 * ("1234.50", "-80.00"); aquí se convierten a enteros sin pasar por
 * flotantes (`Number("0.29") * 100` da 28.999999999999996), se suman y
 * comparan como enteros, y se vuelven a string para enviarlos.
 */

const MONEY_STRING_PATTERN = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Decimal de la API o capturado ("1234.5", "-80.00", "12") → centavos
 * enteros. `null` si no es un decimal de hasta 2 posiciones o desborda el
 * rango de enteros seguros. Acepta espacios en los extremos.
 */
export const moneyToCents = (value: string | null | undefined): number | null => {
  const match = MONEY_STRING_PATTERN.exec((value ?? "").trim());
  if (!match) {
    return null;
  }
  const [, sign, whole, fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    return null;
  }
  return sign && cents !== 0 ? -cents : cents;
};

/** Centavos enteros → decimal de 2 posiciones para la API (-8050 → "-80.50"). */
export const centsToMoney = (cents: number): string => {
  const absolute = Math.abs(Math.trunc(cents));
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${cents < 0 && absolute !== 0 ? "-" : ""}${whole}.${fraction}`;
};

/** Centavos enteros → importe es-MX en pesos para mostrar ("$1,234.50"). */
export const formatCents = (cents: number): string =>
  // `Number` de un decimal de 2 posiciones da el double más cercano y `Intl`
  // lo redondea a 2 decimales: el texto mostrado es exacto.
  formatCurrency(Number(centsToMoney(cents)));
