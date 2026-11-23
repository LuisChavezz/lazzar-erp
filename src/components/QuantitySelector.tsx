/**
 * QuantitySelector.tsx
 *
 * Reusable quantity stepper with increment/decrement buttons and a direct
 * numeric input. Mirrors the pattern used in PurchaseOrderOnboardingStep2.
 *
 * Props:
 *  - value: current quantity
 *  - onChange: called with the new quantity after sanitisation
 *  - min: minimum allowed value (default 1)
 *  - label: aria-label for the input (default "Cantidad")
 *
 * Solo captura ENTEROS y nunca convierte lo escrito en otro número (EC-900):
 * "." y "," se bloquean al teclear y al pegar, un texto que no sea entero se
 * rechaza (el valor no cambia) con un aviso, y tras un separador bloqueado lo
 * que se teclee no cuenta ("1.5" deja 1; ".5" no deja 5) hasta que se borre,
 * se mueva el cursor o se salga del campo. Las reglas viven en el reducer puro
 * `reduceWholeQuantity` (`src/utils/wholeQuantity.ts`); aquí solo se conectan
 * los eventos.
 *
 * `value` puede traer decimales si el consumidor lo fija por su cuenta (en
 * recepciones, "Todo" manda el pendiente exacto, p. ej. 10.5): se muestra tal
 * cual y no cambia mientras el usuario no lo cambie.
 * Borrar sus decimales con Backspace ("10.5" → "10.") lo deja en el entero
 * (10) en lugar de rechazarlo (EC-924); escribir un decimal se sigue rechazando.
 */

"use client";

import { useId, useState, type SyntheticEvent } from "react";
import { PlusIcon } from "./Icons";
import {
  INTEGER_ONLY_HINT,
  reduceWholeQuantity,
  WHOLE_QUANTITY_IDLE,
  type WholeQuantityEvent,
} from "../utils/wholeQuantity";

interface QuantitySelectorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  label?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  label = "Cantidad",
}: QuantitySelectorProps) {
  const hintId = useId();
  const [inputState, setInputState] = useState(WHOLE_QUANTITY_IDLE);
  const showHint = inputState.showHint;

  // Sin `onChange` el input controlado vuelve a mostrar el valor actual.
  const dispatch = (event: WholeQuantityEvent, native?: SyntheticEvent) => {
    const result = reduceWholeQuantity(inputState, event);
    if (result.preventDefault) native?.preventDefault();
    setInputState(result.state);
    if (result.value !== undefined) onChange(result.value);
  };

  return (
    <div className="shrink-0 flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        {/* Decrement */}
        <button
          type="button"
          onClick={() => dispatch({ type: "step", value, direction: -1, min })}
          className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent"
          aria-label="Reducir cantidad"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M5 12h14"/></svg>
        </button>

        {/* Input */}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) =>
            dispatch({
              type: "text",
              raw: e.target.value,
              shown: String(value),
              min,
              deletion: (e.nativeEvent as InputEvent).inputType?.startsWith("delete") ?? false,
            })
          }
          onKeyDown={(e) => dispatch({ type: "key", key: e.key }, e)}
          onPaste={(e) => dispatch({ type: "paste", text: e.clipboardData.getData("text"), min }, e)}
          onMouseDown={() => dispatch({ type: "pointer" })}
          onBlur={() => dispatch({ type: "blur" })}
          onFocus={(e) => e.target.select()}
          className="w-12 text-center text-sm font-semibold bg-transparent border border-slate-300 dark:border-slate-600 rounded-md py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
          aria-label={label}
          aria-describedby={showHint ? hintId : undefined}
        />

        {/* Increment */}
        <button
          type="button"
          onClick={() => dispatch({ type: "step", value, direction: 1, min })}
          className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent"
          aria-label="Aumentar cantidad"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {showHint && (
        <p id={hintId} role="status" className="text-[11px] font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">
          {INTEGER_ONLY_HINT}
        </p>
      )}
    </div>
  );
}
