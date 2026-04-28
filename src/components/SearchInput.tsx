"use client";

import { SearchIcon, CloseIcon } from "./Icons";

// ─── Props ────────────────────────────────────────────────────────────────────
interface SearchInputProps {
  /** Valor actual del campo */
  value: string;
  onChange: (value: string) => void;
  /** Texto de placeholder y label accesible */
  placeholder?: string;
  /** id del input (para vincular con un <label> externo vía htmlFor) */
  id?: string;
  /** Clases adicionales para el contenedor */
  className?: string;
}

/**
 * Input de búsqueda reutilizable con botón de limpiar propio.
 * Oculta el botón nativo de webkit/firefox para evitar duplicación.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  id,
  className,
}: SearchInputProps) {
  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      {/* Ícono de lupa */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <SearchIcon className="h-4 w-4" aria-hidden="true" />
      </div>

      {/* Input: oculta el botón nativo con [&::-webkit-search-cancel-button]:hidden */}
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={[
          "block w-full pl-9 pr-9 py-2 text-sm rounded-xl leading-5",
          "border border-slate-200 dark:border-white/10",
          "bg-white dark:bg-white/5",
          "text-slate-900 dark:text-white placeholder-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500",
          "transition-shadow",
          // Oculta el botón X nativo de webkit (Chrome/Safari/Edge) y Firefox
          "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
          "[-moz-appearance:textfield]",
        ].join(" ")}
      />

      {/* Botón de limpiar propio (solo cuando hay valor) */}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <CloseIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
