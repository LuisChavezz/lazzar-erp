"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import { getQuoteFilterOptions, getQuotesPage } from "../services/actions";
import { QUOTE_FILTER_OPTIONS_QUERY_KEY, QUOTES_TABLE_QUERY_KEY } from "../constants/quotesQueryKeys";
import type { Quote } from "../interfaces/quote.interface";
import type { QuoteListResponse } from "../interfaces/quote-list.interface";
import { quotesTable } from "../utils/quoteListParams";

// A nivel de módulo: una referencia estable entre renders.
const quotesAdapter = limitOffsetAdapter<Quote>();

/**
 * Listado de cotizaciones de Ventas en MODO SERVIDOR (`GET
 * /ventas/cotizaciones/`): filtros, búsqueda, orden y página viven en la URL
 * (`useServerTable`), así que la página que lo monta lo envuelve en
 * `<Suspense>`. El alcance (empresa, y vendedor para quien no es admin) lo
 * pone el backend.
 *
 * Bajo `["quotes"]`: las mutaciones de cotizaciones invalidan ese prefijo y la
 * tabla se relee sola. `fetchAllRows` (exportar) recorre todas las páginas de
 * los criterios vigentes.
 */
export const useQuotesTable = () =>
  useServerTable<typeof quotesTable.filters, QuoteListResponse, Quote>({
    definition: quotesTable,
    queryKey: QUOTES_TABLE_QUERY_KEY,
    queryFn: getQuotesPage,
    adapter: quotesAdapter,
    toastId: "quotes-table-refetch-error",
    refetchErrorMessage: "No se pudieron actualizar las cotizaciones. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar las cotizaciones.",
    cacheDefaultView: true,
  });

/**
 * Catálogo del filtro de cliente (`opciones/`): todos los clientes de las
 * cotizaciones visibles, más "Sin cliente" si alguna no tiene. No reacciona a
 * los filtros. Lo consume el ENCABEZADO de la columna, no la factoría de
 * columnas: la tabla solo tiene una página.
 */
export const useQuoteFilterOptions = () =>
  useGuardedQuery(
    {
      queryKey: QUOTE_FILTER_OPTIONS_QUERY_KEY,
      queryFn: getQuoteFilterOptions,
    },
    {
      toastId: "quote-filter-options-refetch-error",
      errorMessage: "No se pudieron actualizar las opciones de los filtros.",
    },
  );
