"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  areServerTableRangesValid,
  readServerTableState,
  serverTableDefaultPageSize,
  writeServerTableQuery,
  type ServerTableDefinition,
  type ServerTableFilterParams,
  type ServerTableFilterValues,
} from "@/src/utils/serverTableParams";

/**
 * Filtros de una lista con la URL como fuente de verdad, para listas que NO
 * usan `useServerTable` (sin páginas ni total: la bitácora va por cursor, las
 * salidas a maquila son un arreglo plano). Reusa los códecs de
 * `defineServerTable` solo para LEER y ESCRIBIR la URL.
 *
 * - Se leen con `useSearchParams`: la página debe envolver la vista en
 *   `<Suspense>`.
 * - Se escriben con `history.replaceState`, partiendo de la query ACTUAL del
 *   navegador para que dos cambios seguidos no se pisen (mismo criterio que
 *   `useServerTable`).
 * - Cada valor se valida por separado: uno inválido en la URL se trata como
 *   ausente. Un cambio que invertiría un rango de fechas de la definición
 *   (`dateRanges`) no se escribe.
 */
export function useUrlFilters<P extends ServerTableFilterParams>(definition: ServerTableDefinition<P>) {
  type Values = ServerTableFilterValues<P>;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const readFilters = (get: (key: string) => string | null): Values =>
    readServerTableState(definition, get).filters;
  const filters = readFilters((key) => searchParams.get(key));

  const commit = (update: (current: Values) => Values) => {
    const currentQuery = new URLSearchParams(window.location.search);
    const next = update(readFilters((key) => currentQuery.get(key)));
    if (!areServerTableRangesValid(definition, next)) return;
    const qs = writeServerTableQuery(
      definition,
      {
        filters: next,
        search: "",
        ordering: null,
        page: 1,
        pageSize: serverTableDefaultPageSize(definition),
      },
      currentQuery,
    ).toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const setFilter = <K extends keyof Values>(key: K, value: Values[K] | undefined) =>
    commit((current) => {
      const next = { ...current };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });

  return {
    filters,
    hasActiveFilters: Object.keys(filters).length > 0,
    setFilter,
    clearFilters: () => commit(() => ({}) as Values),
  };
}
