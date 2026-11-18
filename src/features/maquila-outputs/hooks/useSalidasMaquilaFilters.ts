"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  readServerTableState,
  serverTableDefaultPageSize,
  writeServerTableQuery,
} from "@/src/utils/serverTableParams";
import {
  SALIDAS_MAQUILA_TABLE,
  type SalidasMaquilaFilterKey,
  type SalidasMaquilaFilterValues,
} from "../constants/salidasMaquilaTable";

const readFilters = (get: (key: string) => string | null): SalidasMaquilaFilterValues =>
  readServerTableState(SALIDAS_MAQUILA_TABLE, get).filters;

/**
 * Filtros del listado de SM con la URL como fuente de verdad, igual que la
 * bitácora (`useDocumentAuditFilters`): se leen con `useSearchParams` (la
 * página envuelve la vista en `<Suspense>`) y se escriben con
 * `history.replaceState` partiendo de la query ACTUAL, para que dos cambios
 * seguidos no se pisen. Un valor inválido en la URL se trata como ausente.
 */
export function useSalidasMaquilaFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFilters((key) => searchParams.get(key));

  const commit = (update: (current: SalidasMaquilaFilterValues) => SalidasMaquilaFilterValues) => {
    const currentQuery = new URLSearchParams(window.location.search);
    const next = update(readFilters((key) => currentQuery.get(key)));
    const qs = writeServerTableQuery(
      SALIDAS_MAQUILA_TABLE,
      {
        filters: next,
        search: "",
        ordering: null,
        page: 1,
        pageSize: serverTableDefaultPageSize(SALIDAS_MAQUILA_TABLE),
      },
      currentQuery,
    ).toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const setFilter = <K extends SalidasMaquilaFilterKey>(key: K, value: SalidasMaquilaFilterValues[K] | undefined) =>
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
    clearFilters: () => commit(() => ({})),
  };
}
