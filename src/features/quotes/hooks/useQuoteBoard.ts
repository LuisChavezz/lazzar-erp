"use client";

import { useState } from "react";
import { keepPreviousData, useQueries, useQueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQuoteBoard, getQuotesPage } from "../services/actions";
import {
  quoteBoardColumnQueryKey,
  quoteBoardPageQueryKey,
  quoteBoardQueryKey,
} from "../constants/quotesQueryKeys";
import { KANBAN_COLUMNS } from "../constants/kanbanColumns";
import type { Quote } from "../interfaces/quote.interface";
import type { QuoteBoard, QuoteListResponse } from "../interfaces/quote-list.interface";
import {
  mergeBoardColumnRows,
  moveQuoteInBoard,
  removeQuoteFromPage,
} from "../utils/quoteBoardCache";

/**
 * Filas por tanda: las primeras de cada columna (`?por_columna=`, el default del
 * backend) y cada "cargar más" (`?limit=` del listado).
 */
export const QUOTE_BOARD_BATCH_SIZE = 20;

/** Estado de UNA columna del tablero, ya con sus "cargar más". */
export interface QuoteBoardColumnState {
  estatus: number;
  /** Conteo del servidor con los filtros vigentes (`tablero/`). */
  total: number;
  /** Filas cargadas, en el orden por defecto del listado, sin repetir. */
  rows: Quote[];
  /** Quedan filas por cargar y no hay una tanda en curso ni fallida. */
  canLoadMore: boolean;
  isLoadingMore: boolean;
  /** La última tanda falló y no trajo nada: se ofrece reintentarla. */
  loadMoreFailed: boolean;
  loadMore: () => void;
  retryLoadMore: () => void;
}

const EMPTY_COLUMN = { total: 0, results: [] as Quote[] };

/**
 * Tablero de cotizaciones en MODO SERVIDOR (EC-809):
 *
 * - UNA consulta a `tablero/` (`["quotes", "tablero", params]`) con las
 *   primeras `QUOTE_BOARD_BATCH_SIZE` filas y el `total` de cada estatus, con
 *   la búsqueda `q`. No usa `useServerTable`: el listado está montado a la vez
 *   y la URL es suya.
 * - "Cargar más" por columna con el listado (`?estatus=N&limit=20&offset=k`),
 *   una consulta por tanda (`["quotes", "tablero-columna", params, N, k]`): el
 *   backend garantiza los mismos ids y orden que el tablero. Las tandas se
 *   olvidan al cambiar la búsqueda.
 * - Todo cuelga de `["quotes"]`: cualquier mutación de cotizaciones (también
 *   las de Mesa de Control) relee tablero y tandas. No hay copia local de las
 *   columnas, así que nada se congela tras un arrastre.
 * - `moveQuote` es el envío a revisión OPTIMISTA (1/4 → 2): escribe la caché
 *   del tablero y de las tandas de la columna de origen, con los conteos, y
 *   devuelve cómo deshacerlo. El servidor reconcilia al terminar la mutación
 *   (`useSubmitQuoteForReview` invalida `["quotes"]`).
 */
export const useQuoteBoard = (search: string) => {
  const queryClient = useQueryClient();
  const params: Record<string, string> = search ? { q: search } : {};
  const paramsKey = JSON.stringify(params);
  const boardKey = quoteBoardQueryKey(params);

  const board = useGuardedQuery(
    {
      queryKey: boardKey,
      queryFn: () => getQuoteBoard({ ...params, por_columna: QUOTE_BOARD_BATCH_SIZE }),
      placeholderData: keepPreviousData,
    },
    {
      toastId: "quote-board-refetch-error",
      errorMessage: "No se pudo actualizar el tablero. Se muestran los datos anteriores.",
    },
  );

  // Tandas pedidas por columna, recordadas SOLO para la búsqueda con que se
  // pidieron: otra búsqueda vuelve a las primeras filas de cada columna.
  const [extra, setExtra] = useState<{ key: string; batches: Record<number, number> }>({
    key: paramsKey,
    batches: {},
  });
  const batches = extra.key === paramsKey ? extra.batches : {};

  const pageSpecs = KANBAN_COLUMNS.flatMap((column) =>
    Array.from({ length: batches[column.estatus] ?? 0 }, (_, index) => ({
      estatus: column.estatus,
      offset: QUOTE_BOARD_BATCH_SIZE * (index + 1),
    })),
  );
  const pages = useQueries({
    queries: pageSpecs.map(({ estatus, offset }) => ({
      queryKey: quoteBoardPageQueryKey(params, estatus, offset),
      queryFn: () =>
        getQuotesPage({ ...params, estatus: String(estatus), limit: QUOTE_BOARD_BATCH_SIZE, offset }),
    })),
  });

  const addBatch = (estatus: number) =>
    setExtra((current) => {
      const base = current.key === paramsKey ? current.batches : {};
      return { key: paramsKey, batches: { ...base, [estatus]: (base[estatus] ?? 0) + 1 } };
    });

  const columns: QuoteBoardColumnState[] = KANBAN_COLUMNS.map((config) => {
    const column =
      board.data?.columnas.find((candidate) => candidate.estatus === config.estatus) ?? EMPTY_COLUMN;
    const columnPages = pageSpecs
      .map((spec, index) => ({ spec, query: pages[index] }))
      .filter(({ spec }) => spec.estatus === config.estatus)
      .map(({ query }) => query);
    const loadedPages = columnPages
      .map((query) => query.data)
      .filter((page): page is QuoteListResponse => page !== undefined);
    const rows = mergeBoardColumnRows(column.results, loadedPages);
    const last = columnPages.at(-1);
    const isLoadingMore = last !== undefined && last.data === undefined && last.isFetching;
    const loadMoreFailed = last !== undefined && last.data === undefined && last.isError && !last.isFetching;
    return {
      estatus: config.estatus,
      total: column.total,
      rows,
      canLoadMore: rows.length < column.total && !isLoadingMore && !loadMoreFailed,
      isLoadingMore,
      loadMoreFailed,
      loadMore: () => addBatch(config.estatus),
      retryLoadMore: () => void last?.refetch(),
    };
  });

  /** Todas las filas cargadas del tablero (para arrastrar y para los diálogos). */
  const loadedRows = columns.flatMap((column) => column.rows);

  const moveQuote = async (
    quote: Quote,
    sourceEstatus: number,
    target: { estatus: number; label: string },
  ): Promise<() => void> => {
    const sourcePagesKey = quoteBoardColumnQueryKey(params, sourceEstatus);
    await Promise.all([
      queryClient.cancelQueries({ queryKey: boardKey, exact: true }),
      queryClient.cancelQueries({ queryKey: sourcePagesKey }),
    ]);
    const previousBoard = queryClient.getQueryData<QuoteBoard>(boardKey);
    const previousPages = queryClient.getQueriesData<QuoteListResponse>({ queryKey: sourcePagesKey });
    if (previousBoard) {
      queryClient.setQueryData<QuoteBoard>(
        boardKey,
        moveQuoteInBoard(previousBoard, quote, sourceEstatus, target),
      );
    }
    queryClient.setQueriesData<QuoteListResponse>({ queryKey: sourcePagesKey }, (page) =>
      removeQuoteFromPage(page, quote.id),
    );
    return () => {
      if (previousBoard) queryClient.setQueryData(boardKey, previousBoard);
      for (const [key, page] of previousPages) queryClient.setQueryData(key, page);
    };
  };

  return {
    columns,
    loadedRows,
    moveQuote,
    hasLoaded: board.hasLoaded,
    isLoading: board.isLoading,
    isInitialError: board.isInitialError,
    error: board.error,
    /** Llega una búsqueda nueva: se muestran las columnas anteriores atenuadas. */
    isTransitioning: board.isPlaceholderData,
    refetch: board.refetch,
  };
};
