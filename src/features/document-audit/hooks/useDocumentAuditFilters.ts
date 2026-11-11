"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  areServerTableRangesValid,
  readServerTableState,
  serverTableDefaultPageSize,
  writeServerTableQuery,
} from "@/src/utils/serverTableParams";
import {
  DOCUMENT_AUDIT_TABLE,
  type DocumentAuditFilterKey,
  type DocumentAuditFilterValues,
} from "../constants/documentAuditTable";

const readFilters = (get: (key: string) => string | null): DocumentAuditFilterValues =>
  readServerTableState(DOCUMENT_AUDIT_TABLE, get).filters;

/**
 * Filtros de la bitácora con la URL como fuente de verdad: se leen con
 * `useSearchParams` (la página debe envolver la vista en `<Suspense>`) y se
 * escriben con `history.replaceState`, partiendo de la query ACTUAL del
 * navegador para que dos cambios seguidos no se pisen (mismo criterio que
 * `useServerTable`). Cada valor se valida por separado: uno inválido en la URL
 * se trata como ausente, y un cambio que invertiría el rango de fechas no se
 * escribe.
 */
export function useDocumentAuditFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFilters((key) => searchParams.get(key));

  const commit = (update: (current: DocumentAuditFilterValues) => DocumentAuditFilterValues) => {
    const currentQuery = new URLSearchParams(window.location.search);
    const next = update(readFilters((key) => currentQuery.get(key)));
    if (!areServerTableRangesValid(DOCUMENT_AUDIT_TABLE, next)) return;
    const qs = writeServerTableQuery(
      DOCUMENT_AUDIT_TABLE,
      {
        filters: next,
        search: "",
        ordering: null,
        page: 1,
        pageSize: serverTableDefaultPageSize(DOCUMENT_AUDIT_TABLE),
      },
      currentQuery,
    ).toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const setFilter = <K extends DocumentAuditFilterKey>(
    key: K,
    value: DocumentAuditFilterValues[K] | undefined,
  ) =>
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
