/**
 * ColorOption.tsx
 * Botón/chip reutilizable para representar una opción de color seleccionable.
 * Muestra la muestra visual en `codigo_hex` y el nombre del color.
 */
import type { Color } from "../../colors/interfaces/color.interface";

export interface ColorOptionProps {
  color: Color;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * `ColorOption`
 * Chip de color con swatch visual y nombre. Selección indicada únicamente con
 * borde de acento, sin ícono superpuesto ni ring secundario.
 */
export function ColorOption({ color, isSelected, onSelect }: ColorOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`Seleccionar color ${color.nombre}`}
      onClick={onSelect}
      className={`
        w-16 flex flex-col items-center gap-2 p-2.5 rounded-xl border-2
        transition-all duration-150 cursor-pointer select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
        focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900
        ${
          isSelected
            ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50"
            : "border-transparent bg-white/70 dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-white/15"
        }
      `}
    >
      {/* Muestra de color */}
      <span
        className="w-7 h-7 rounded-full border border-black/10 dark:border-white/20 shadow-sm"
        style={{ backgroundColor: color.codigo_hex }}
        aria-hidden="true"
      />
      {/* Nombre del color */}
      <span
        className={`text-[10px] font-semibold text-center leading-tight line-clamp-2 ${
          isSelected
            ? "text-sky-700 dark:text-sky-400"
            : "text-slate-600 dark:text-slate-300"
        }`}
      >
        {color.nombre}
      </span>
    </button>
  );
}
