"use client";

import { PlusIcon } from "./Icons";
import { sanitizeDecimalInput } from "../utils/decimal";

/**
 * Selector de cantidad decimal con TECHO (`max`) — extraído de las copias
 * casi idénticas que picking (`PickingTallaQuantityInput`, surtido por talla)
 * y packing (`PackingLineQuantityInput`, empaque por línea) mantenían por
 * separado. No se generaliza a partir de `QuantitySelector` (el stepper
 * compartido genérico): aquel es entero, sin techo, pensado para cantidades
 * de captura libre (p. ej. número de piezas de una orden) — este necesita
 * DECIMALES (hasta `decimalPlaces`, 4 por contrato en ambos consumidores
 * actuales) y un TECHO por línea (`max = lo pendiente`, para no exceder lo
 * disponible ni provocar un 400 del backend). El valor viaja como string
 * ("" = "no capturar esta línea en este envío").
 *
 * El backend siempre valida el pendiente, pero clampar aquí evita el ida y
 * vuelta en el caso normal. Una línea sin pendiente (`max <= 0`) se muestra
 * deshabilitada en lugar de ocultarse.
 */
interface DecimalQuantityInputProps {
  value: string;
  /** Techo del input — lo pendiente real de la línea (nombre del campo de origen varía por consumidor). */
  max: number;
  disabled?: boolean;
  onChange: (next: string) => void;
  label?: string;
  /** Decimales aceptados (`decimal_places` del backend). Ambos consumidores actuales usan 4. */
  decimalPlaces?: number;
}

export function DecimalQuantityInput({
  value,
  max,
  disabled = false,
  onChange,
  label = "Cantidad",
  decimalPlaces = 4,
}: DecimalQuantityInputProps) {
  const isDisabled = disabled || max <= 0;
  const current = Number.parseFloat(value) || 0;

  const emit = (next: number) => {
    // `toFixed` antes de `String`: sumar/restar 1 sobre un decimal arrastra
    // ruido binario (`1.1 - 1` → 0.10000000000000009), que sin recortar se
    // escribiría tal cual en el input mientras el envío sí lo redondea a
    // `decimalPlaces` — lo MOSTRADO dejaría de coincidir con lo ENVIADO.
    const clamped = Number(Math.min(Math.max(0, next), max).toFixed(decimalPlaces));
    onChange(clamped <= 0 ? "" : String(clamped));
  };

  const decrement = () => emit(current - 1);
  const increment = () => emit(current + 1);

  const handleText = (raw: string) => {
    const sanitized = sanitizeDecimalInput(raw, decimalPlaces);
    if (sanitized === "") {
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
