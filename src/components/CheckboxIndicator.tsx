import { CheckIcon } from "@/src/components/Icons";

/**
 * Indicador cuadrado tipo casilla (selección MÚLTIPLE) para listas buscables
 * de selección múltiple. Pareja del `renderRadioIndicator` circular de
 * `RadioIndicator.tsx`.
 */
export function renderCheckboxIndicator(selected: boolean) {
  return (
    <span
      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        selected
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-slate-300 dark:border-slate-600"
      }`}
    >
      {selected && <CheckIcon className="w-3.5 h-3.5" />}
    </span>
  );
}
