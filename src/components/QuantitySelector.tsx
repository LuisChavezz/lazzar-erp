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
 * Solo captura ENTEROS y nunca transforma lo escrito (EC-900): "." y "," se
 * bloquean al teclear y al pegar, y un texto que no sea entero se rechaza (el
 * valor no cambia) con un aviso. Tras un separador bloqueado, los dígitos que
 * se teclean al final se descartan también (son la parte decimal): "1.5" deja
 * 1, no 15, hasta que se borre, se mueva el cursor o se salga del campo.
 * Reglas en `src/utils/wholeQuantity.ts`.
 *
 * `value` puede traer decimales si el consumidor lo fija por su cuenta (en
 * recepciones, "Todo" manda el pendiente exacto, p. ej. 10.5): se muestra tal
 * cual y no cambia mientras el usuario no lo cambie.
 */

"use client";

import { useId, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { PlusIcon } from "./Icons";
import {
  appendsDigitsAtEnd,
  INTEGER_ONLY_HINT,
  isDecimalSeparatorKey,
  isPastableWholeQuantity,
  parseWholeQuantity,
  stepWholeQuantity,
} from "../utils/wholeQuantity";

/** Teclas que borran o mueven el cursor. */
const CARET_KEYS: ReadonlySet<string> = new Set([
  "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
]);

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
  const [showHint, setShowHint] = useState(false);
  // Se bloqueó un separador y aún no se borra ni se sale del campo: lo que se
  // teclee al final es la parte decimal y no cuenta.
  const [fractionBlocked, setFractionBlocked] = useState(false);

  const block = () => {
    setShowHint(true);
    setFractionBlocked(true);
  };

  const reset = () => {
    setShowHint(false);
    setFractionBlocked(false);
  };

  const accept = (next: number) => {
    reset();
    onChange(next);
  };

  // También cubre lo que no pasa por `onKeyDown`/`onPaste` (autocompletar, IME,
  // teclados móviles que no informan la tecla): sin `onChange` el input
  // controlado vuelve al valor actual.
  const handleText = (raw: string) => {
    const next = parseWholeQuantity(raw, min);
    if (next === null || (fractionBlocked && appendsDigitsAtEnd(raw, String(value)))) block();
    else accept(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isDecimalSeparatorKey(event.key)) {
      event.preventDefault();
      block();
      return;
    }
    // Borrar o mover el cursor cierra la "parte decimal": se vuelve a teclear normal.
    if (fractionBlocked && CARET_KEYS.has(event.key)) setFractionBlocked(false);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (isPastableWholeQuantity(event.clipboardData.getData("text"))) return;
    event.preventDefault();
    setShowHint(true);
  };

  return (
    <div className="shrink-0 flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        {/* Decrement */}
        <button
          type="button"
          onClick={() => accept(stepWholeQuantity(value, -1, min))}
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
          onChange={(e) => handleText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={reset}
          onFocus={(e) => e.target.select()}
          className="w-12 text-center text-sm font-semibold bg-transparent border border-slate-300 dark:border-slate-600 rounded-md py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
          aria-label={label}
          aria-describedby={showHint ? hintId : undefined}
        />

        {/* Increment */}
        <button
          type="button"
          onClick={() => accept(stepWholeQuantity(value, 1, min))}
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
