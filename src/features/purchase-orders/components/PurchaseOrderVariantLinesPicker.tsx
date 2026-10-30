"use client";

import { useState } from "react";
import { SearchInput } from "@/src/components/SearchInput";
import { LoadingSpinnerIcon } from "@/src/components/Icons";
import { useDebounce } from "@/src/hooks/useDebounce";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { usePurchaseOrderVariantSearch } from "../hooks/usePurchaseOrderVariantSearch";
import type { PurchaseOrderLinesState } from "../hooks/usePurchaseOrderLines";
import {
  lineFromVariante,
  lineKeyVariante,
  type PurchaseOrderLine,
} from "../utils/purchaseOrderLines";
import { CheckBox, LineInfo, PinnedLineRow } from "./PurchaseOrderLineRow";

interface PurchaseOrderVariantLinesPickerProps {
  lines: PurchaseOrderLinesState;
  /**
   * Renglones guardados de la orden (edición). Siguen a la vista aunque se
   * desmarquen, para poder volver a marcarlos: un renglón "Sin SKU" no se puede
   * recuperar desde el buscador, que solo ofrece variantes.
   */
  seedLines?: PurchaseOrderLine[];
  monedaCodigo: string | null;
}

/**
 * Renglones de una OC de producto terminado (EC-657): se compra por SKU.
 *
 * Arriba, FIJOS, los renglones de la orden (los marcados y los guardados), con
 * su cantidad y precio: siguen visibles aunque la búsqueda ya no los incluya,
 * para que "Crear"/"Guardar" nunca envíe algo que el usuario no ve. Abajo, los
 * resultados de la búsqueda de variantes contra el servidor (debounced, hasta
 * 50), sin los ya fijados.
 *
 * No se reutiliza `SearchableSelectList`: filtra en cliente sobre un arreglo
 * precargado y cada fila es un botón, donde no caben el stepper ni el precio.
 * Mismo patrón de búsqueda que `RfidLabelSearchStep`.
 */
export function PurchaseOrderVariantLinesPicker({
  lines,
  seedLines = [],
  monedaCodigo,
}: PurchaseOrderVariantLinesPickerProps) {
  const [query, setQuery] = useState("");
  // La búsqueda pega al servidor: 350 ms, como el onboarding de etiquetas RFID.
  const debouncedQuery = useDebounce(query.trim(), 350);
  const { variantes, hasLoaded, isInitialError, isFetching, isPlaceholderData, refetch } =
    usePurchaseOrderVariantSearch(debouncedQuery);

  // Fijados: primero los guardados (en su orden), luego los marcados en la
  // sesión que no son guardados.
  const seedKeys = new Set(seedLines.map((l) => l.key));
  const pinned = [...seedLines, ...lines.lines.filter((l) => !seedKeys.has(l.key))];
  const pinnedKeys = new Set(pinned.map((l) => l.key));
  const results = variantes.filter((v) => !pinnedKeys.has(lineKeyVariante(v.id)));
  // Hay una búsqueda en camino (tecleando, o la nueva llave aún sin respuesta):
  // los resultados mostrados son de la anterior.
  const isSearching = isPlaceholderData || (isFetching && !hasLoaded) || debouncedQuery !== query.trim();

  return (
    <div className="space-y-4">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Buscar por SKU o nombre..."
      />

      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {lines.count === 0
          ? "Ningún SKU seleccionado"
          : `${lines.count} renglón${lines.count === 1 ? "" : "es"} seleccionado${lines.count === 1 ? "" : "s"}`}
      </p>

      <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
        {pinned.map((line) => (
          <PinnedLineRow key={line.key} line={line} lines={lines} monedaCodigo={monedaCodigo} />
        ))}

        {pinned.length > 0 && (
          <div className="pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Resultados de la búsqueda
          </div>
        )}

        {isInitialError ? (
          <div className="rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            No se pudieron buscar los SKU.{" "}
            <button
              type="button"
              onClick={() => void refetch()}
              className="font-semibold underline cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : !hasLoaded ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
            <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
            Buscando...
          </div>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {debouncedQuery
              ? "No se encontraron SKU que coincidan con la búsqueda"
              : "No hay SKU de producto terminado disponibles"}
          </p>
        ) : (
          <div
            aria-busy={isSearching || undefined}
            className={`space-y-1 transition-opacity ${isSearching ? "opacity-60" : ""}`}
          >
            {results.map((v) => {
              const line = lineFromVariante(v);
              return (
                <button
                  key={line.key}
                  type="button"
                  onClick={() => lines.toggle(line)}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-left transition-all duration-150 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10"
                >
                  <CheckBox selected={false} />
                  <LineInfo line={line} />
                  {/* Sin símbolo: `precio_base` no declara moneda (EC-606). */}
                  <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {formatMoneyValue(v.precio_base, null)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
