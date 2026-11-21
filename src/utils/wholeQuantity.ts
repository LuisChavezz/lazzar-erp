/**
 * Reglas de captura de `QuantitySelector`, que solo acepta ENTEROS (EC-900).
 * Lo escrito nunca se transforma en otro número: antes se borraba todo lo que
 * no fuera dígito y "1.5" se guardaba como 15.
 *
 * `reduceWholeQuantity` decide, a partir del estado del selector y de un
 * evento del input, el valor nuevo (si cambia), el estado siguiente y si se
 * cancela la acción del navegador. El componente solo conecta eventos.
 */

/** Aviso que muestra el selector al rechazar un separador o un texto no entero. */
export const INTEGER_ONLY_HINT = "Solo se aceptan cantidades enteras";

/** Teclas de separador decimal: "." (también la del teclado numérico) y ",". */
const SEPARATOR_KEYS: ReadonlySet<string> = new Set([".", ",", "Decimal"]);

/** Teclas que borran o mueven el cursor: cierran la "parte decimal". */
const CARET_KEYS: ReadonlySet<string> = new Set([
  "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
]);

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
 * Pasos de "−" y "+". Con un valor fraccionario (fijado por el consumidor,
 * p. ej. el pendiente exacto de una recepción) van al entero de al lado:
 * 10.5 → 10 con "−" y 10.5 → 11 con "+". El techo lo pone el consumidor.
 */
export const stepWholeQuantity = (value: number, direction: -1 | 1, min: number): number => {
  if (direction === 1) return Math.floor(value) + 1;
  return Math.max(min, Number.isInteger(value) ? value - 1 : Math.floor(value));
};

export interface WholeQuantityState {
  /**
   * Se bloqueó un separador y aún no se borra, se mueve el cursor ni se sale
   * del campo: lo que se teclee ahora es la parte decimal y no cuenta.
   */
  fractionBlocked: boolean;
  /** El aviso `INTEGER_ONLY_HINT` está a la vista. */
  showHint: boolean;
}

export const WHOLE_QUANTITY_IDLE: WholeQuantityState = { fractionBlocked: false, showHint: false };

export type WholeQuantityEvent =
  /** Tecla pulsada (`keydown`). */
  | { type: "key"; key: string }
  /** Texto nuevo del input (`change`); `shown` es el que mostraba antes. */
  | { type: "text"; raw: string; shown: string; min: number }
  /** Texto pegado (`paste`), antes de que el navegador lo inserte. */
  | { type: "paste"; text: string; min: number }
  /** Clic en el campo: el cursor se movió con el mouse. */
  | { type: "pointer" }
  /** El campo perdió el foco. */
  | { type: "blur" }
  /** "−" o "+". */
  | { type: "step"; value: number; direction: -1 | 1; min: number };

export interface WholeQuantityResult {
  state: WholeQuantityState;
  /** Valor nuevo para `onChange`; ausente = el valor no cambia. */
  value?: number;
  /** Cancelar la acción del navegador (`event.preventDefault()`). */
  preventDefault?: boolean;
}

const HAS_SEPARATOR = /[.,]/;

export function reduceWholeQuantity(state: WholeQuantityState, event: WholeQuantityEvent): WholeQuantityResult {
  switch (event.type) {
    case "key":
      if (isDecimalSeparatorKey(event.key)) {
        return { state: { fractionBlocked: true, showHint: true }, preventDefault: true };
      }
      if (state.fractionBlocked && CARET_KEYS.has(event.key)) {
        return { state: { ...state, fractionBlocked: false } };
      }
      return { state };

    case "text": {
      // Con la parte decimal bloqueada solo pasa lo que BORRA: insertar o
      // reemplazar (".5" sobre el texto seleccionado deja "5") no cuenta.
      if (state.fractionBlocked && event.raw.length >= event.shown.length) {
        return { state: { fractionBlocked: true, showHint: true } };
      }
      const next = parseWholeQuantity(event.raw, event.min);
      if (next === null) {
        // Un separador que no pasó por `keydown` (IME, teclado móvil) abre la
        // parte decimal; una letra o un signo solo se rechazan.
        return { state: { fractionBlocked: HAS_SEPARATOR.test(event.raw), showHint: true } };
      }
      return { state: WHOLE_QUANTITY_IDLE, value: next };
    }

    case "paste":
      if (isPastableWholeQuantity(event.text)) return { state };
      return { state: { ...state, showHint: true }, preventDefault: true };

    case "pointer":
      return state.fractionBlocked ? { state: { ...state, fractionBlocked: false } } : { state };

    case "blur":
      return { state: WHOLE_QUANTITY_IDLE };

    case "step":
      return { state: WHOLE_QUANTITY_IDLE, value: stepWholeQuantity(event.value, event.direction, event.min) };
  }
}
