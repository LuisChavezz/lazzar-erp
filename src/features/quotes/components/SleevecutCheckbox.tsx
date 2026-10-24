"use client";

interface SleevecutCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** ¿Lo admite la matriz prenda/proceso para la selección actual? */
  allowed: boolean;
  /** Qué decir en lugar de la casilla cuando no se admite. */
  notAllowedMessage: string;
}

/**
 * Casilla "Corte de manga" del diálogo de agregar productos (catálogo y
 * muestra). Si la selección no lo admite (CO-04), en su lugar dice por qué.
 */
export function SleevecutCheckbox({
  id,
  checked,
  onChange,
  allowed,
  notAllowedMessage,
}: SleevecutCheckboxProps) {
  if (!allowed) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500">{notAllowedMessage}</span>
    );
  }

  return (
    <label
      className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none"
      htmlFor={id}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-4 h-4 rounded border-slate-300"
      />
      Corte de manga
    </label>
  );
}
