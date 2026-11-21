/**
 * Reglas de captura de `QuantitySelector`, que solo acepta ENTEROS (EC-900).
 * Lo escrito nunca se transforma: antes se borraba todo lo que no fuera dígito
 * y "1.5" se guardaba como 15.
 */

/** Aviso que muestra el selector al rechazar un separador o un texto no entero. */
export const INTEGER_ONLY_HINT = "Solo se aceptan cantidades enteras";

/** Teclas de separador decimal: "." (también la del teclado numérico) y ",". */
const SEPARATOR_KEYS: ReadonlySet<string> = new Set([".", ",", "Decimal"]);

export const isDecimalSeparatorKey = (key: string): boolean => SEPARATOR_KEYS.has(key);

/** Texto pegado que el selector deja entrar: solo dígitos (los espacios alrededor no cuentan). */
export const isPastableWholeQuantity = (text: string): boolean => /^\d+$/.test(text.trim());

/**
 * Cantidad del texto del input: `min` si está vacío, el entero (al menos
 * `min`) si son solo dígitos, y `null` si trae cualquier otra cosa ("1.5",
 * "1,5", "2a", "-3"): el selector lo rechaza y conserva el valor que tenía.
 */
export const parseWholeQuantity = (raw: string, min: number): number | null => {
  if (raw === "") return min;
  if (!/^\d+$/.test(raw)) return null;
  return Math.max(min, Number.parseInt(raw, 10));
};

/**
 * ¿`raw` solo AGREGA dígitos al final de lo que mostraba el input (`shown`)?
 * Tras bloquear un separador, esos dígitos son la parte decimal ("1.5": el "5")
 * y el selector los descarta, para que teclear "1.5" deje 1 y no 15.
 */
export const appendsDigitsAtEnd = (raw: string, shown: string): boolean =>
  raw.length > shown.length && raw.startsWith(shown) && /^\d+$/.test(raw.slice(shown.length));

/**
 * Pasos de "−" y "+". Con un valor fraccionario (fijado por el consumidor,
 * p. ej. el pendiente exacto de una recepción) van al entero de al lado:
 * 10.5 → 10 con "−" y 10.5 → 11 con "+". El techo lo pone el consumidor.
 */
export const stepWholeQuantity = (value: number, direction: -1 | 1, min: number): number => {
  if (direction === 1) return Math.floor(value) + 1;
  return Math.max(min, Number.isInteger(value) ? value - 1 : Math.floor(value));
};
