"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useDebounce } from "@/src/hooks/useDebounce";
import { SearchInput } from "@/src/components/SearchInput";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { LoadingSpinnerIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useRfidLabelOnboarding } from "../hooks/useRfidLabelOnboarding";
import type { RfidOnboardingResult } from "../interfaces/rfid-onboarding.interface";

interface RfidLabelSearchStepProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Selección ya confirmada (para resaltarla al regresar desde el Paso 2). */
  initialSelected: RfidOnboardingResult | null;
  /** Confirma la selección y avanza al Paso 2. */
  onConfirm: (result: RfidOnboardingResult) => void;
}

/** Dos resultados son el mismo si coinciden `tipo` + `id` (la llave de fila). */
function sameResult(
  a: RfidOnboardingResult | null,
  b: RfidOnboardingResult | null,
): boolean {
  return a !== null && b !== null && a.tipo === b.tipo && a.id === b.id;
}

/**
 * Paso 1 — Búsqueda: input buscable (`SearchInput`) que llama
 * `GET /onboarding/?q=...` debounced y lista los resultados como opciones de
 * SELECCIÓN (no avanzan al hacer clic). Se resalta la fila elegida y un botón
 * "Continuar" —deshabilitado hasta que hay selección— avanza al Paso 2. Mismo
 * patrón que `ProductionOrderStep1` (lista buscable con selección + barra de
 * acción con "Continuar"); la lista tiene su propio scroll interno.
 *
 * No se reutiliza `SearchableSelectList` porque ese componente incrusta su
 * propio buscador y FILTRA EN CLIENTE sobre un arreglo precargado, mientras que
 * aquí la búsqueda es contra el servidor (debounced). Sí se reutilizan sus
 * piezas atómicas: `SearchInput` y `renderRadioIndicator`, con el mismo estilo
 * de fila/scroll.
 */
export function RfidLabelSearchStep({
  query,
  onQueryChange,
  initialSelected,
  onConfirm,
}: RfidLabelSearchStepProps) {
  // Selección tentativa local; se siembra con la ya confirmada para que al
  // regresar del Paso 2 (botón "Cambiar") la fila siga resaltada.
  const [selected, setSelected] = useState<RfidOnboardingResult | null>(initialSelected);

  // 350ms: la búsqueda pega al SERVIDOR (no filtra en cliente), así que se usa
  // un intervalo un poco mayor que el de un filtrado local para no disparar una
  // petición por pulsación. Default razonable, no una convención confirmada.
  const debouncedQuery = useDebounce(query, 350);

  const { data, isLoading, isError, error } = useRfidLabelOnboarding({
    q: debouncedQuery,
  });

  const resultados = data?.resultados ?? [];

  // Solo se puede continuar si la selección sigue presente en los resultados
  // ACTUALES. Así, si el usuario cambia la búsqueda a algo que ya no incluye lo
  // elegido, "Continuar" se deshabilita en vez de avanzar con una selección
  // invisible. No se resetea `selected` sin más: al regresar del Paso 2 (misma
  // búsqueda, mismos resultados) la fila sigue presente y conserva el resaltado.
  const selectedInResults =
    selected !== null && resultados.some((result) => sameResult(result, selected));

  const handleContinue = () => {
    if (selectedInResults && selected) onConfirm(selected);
  };

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder="Buscar por SKU, nombre, código o cod. proscai..."
      />

      {/* Lista con scroll interno acotado: el modal no crece con los resultados. */}
      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
        {isError ? (
          <p className="rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {extractErrorMessage(error, "No se pudo buscar. Intenta de nuevo.")}
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
            Buscando...
          </div>
        ) : resultados.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10 italic">
            No hay productos ni variantes que coincidan con la búsqueda.
          </p>
        ) : (
          resultados.map((result) => {
            const isSelected = sameResult(selected, result);
            return (
              <button
                key={`${result.tipo}-${result.id}`}
                type="button"
                onClick={() => setSelected(result)}
                aria-pressed={isSelected}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                }`}
              >
                {renderRadioIndicator(isSelected)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {result.nombre}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {result.tipo === "variante"
                          ? result.sku ?? "—"
                          : result.codigo ?? result.cod_proscai ?? "—"}
                        {(result.color_nombre || result.talla_nombre) && (
                          <span className="ml-2 font-sans text-slate-400 dark:text-slate-500">
                            {[result.color_nombre, result.talla_nombre]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        result.tipo === "variante"
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                          : "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                      }`}
                    >
                      {result.tipo === "variante" ? "Variante" : "Producto"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Barra de acción: "Continuar" deshabilitado hasta que haya una selección
          visible en los resultados actuales. */}
      <div className="flex items-center justify-end border-t border-slate-200 dark:border-white/10 pt-4">
        <button
          type="button"
          disabled={!selectedInResults}
          onClick={handleContinue}
          aria-disabled={!selectedInResults}
          className={`inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all ${
            selectedInResults
              ? "cursor-pointer hover:bg-sky-700 active:scale-[0.97]"
              : "cursor-not-allowed opacity-60"
          }`}
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
