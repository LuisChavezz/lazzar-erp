"use client";

import { PlusIcon } from "@/src/components/Icons";

/**
 * Selector de cantidad a surtir por talla — versión de picking del
 * `QuantitySelector` compartido, que NO se reutiliza porque este necesita dos
 * cosas que aquel no ofrece: TECHO por línea (`max = cantidad_pendiente`, para
 * no exceder lo pendiente ni provocar el 400 del backend) y DECIMALES (el
 * contrato admite `cantidad_asignada` con hasta 4 decimales). El valor viaja
 * como string ("" = "no surtir esta talla en esta entrega").
 *
 * El backend siempre valida el pendiente, pero clampar aquí evita el ida y
 * vuelta en el caso normal. Una talla sin pendiente (`max <= 0`) se muestra
 * deshabilitada en lugar de ocultarse.
 */
interface PickingTallaQuantityInputProps {
  value: string;
  /** Cantidad pendiente para esta talla — techo del input. */
  max: number;
  disabled?: boolean;
  onChange: (next: string) => void;
  label?: string;
}

/**
 * Deja solo dígitos, UN punto decimal y como máximo 4 decimales (el backend usa
 * `decimal_places=4`). Ese tope de 4 decimales además impone de facto el piso
 * `min_value=0.0001`: el menor positivo representable con 4 decimales ES 0.0001,
 * así que el input nunca puede sostener un valor positivo por debajo del mínimo.
 */
function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  const intPart = cleaned.slice(0, firstDot);
  const fracPart = cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, 4);
  return `${intPart}.${fracPart}`;
}

export function PickingTallaQuantityInput({
  value,
  max,
  disabled = false,
  onChange,
  label = "Cantidad a surtir",
}: PickingTallaQuantityInputProps) {
  const isDisabled = disabled || max <= 0;
  const current = Number.parseFloat(value) || 0;

  const emit = (next: number) => {
    const clamped = Math.min(Math.max(0, next), max);
    onChange(clamped <= 0 ? "" : String(clamped));
  };

  const decrement = () => emit(current - 1);
  const increment = () => emit(current + 1);

  const handleText = (raw: string) => {
    const sanitized = sanitizeDecimal(raw);
    if (sanitized === "" || sanitized === ".") {
      onChange("");
      return;
    }
    const parsed = Number.parseFloat(sanitized);
    if (Number.isNaN(parsed)) {
      onChange("");
      return;
    }
    // Clampa al pendiente conservando la escritura parcial (p. ej. "1.") cuando
    // no excede el techo.
    onChange(parsed > max ? String(max) : sanitized);
  };

  return (
    <div className="shrink-0 flex items-center gap-1">
      <button
        type="button"
        onClick={decrement}
        disabled={isDisabled}
        className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Reducir cantidad"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M5 12h14"/></svg>
      </button>

      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={isDisabled}
        placeholder="0"
        onChange={(event) => handleText(event.target.value)}
        onFocus={(event) => event.target.select()}
        className="w-16 text-center text-sm font-semibold bg-transparent border border-slate-300 dark:border-slate-600 rounded-md py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={label}
      />

      <button
        type="button"
        onClick={increment}
        disabled={isDisabled}
        className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Aumentar cantidad"
      >
        <PlusIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
