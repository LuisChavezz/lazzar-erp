"use client";

import { useState } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQuoteBoard, getQuotesPage } from "../services/actions";
import {
  quoteBoardColumnBatchesQueryKey,
  quoteBoardColumnQueryKey,
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

/** Offsets de las tandas de "cargar más": 20, 40, 60… */
const batchOffsets = (batches: number) =>
  Array.from({ length: batches }, (_, index) => QUOTE_BOARD_BATCH_SIZE * (index + 1));

/**
 * "Cargar más" de UNA columna: una sola `useGuardedQuery` con todas las tandas
 * pedidas (`["quotes", "tablero-columna", params, N, tandas]`), así un refetch
 * fallido conserva lo cargado y avisa por toast, como cualquier otra lista.
 *
 * - Pedir una tanda más estrena llave: la consulta reutiliza las páginas de la
 *   llave anterior (en caché) y solo pide la nueva (`?estatus=N&limit=20&offset=k`).
 *   Mientras llega, se muestran las anteriores (`keepPreviousData`).
 * - Un refetch de la MISMA llave (la invalidación de `["quotes"]`) relee todas
 *   las tandas, en paralelo.
 * - Si falla la tanda nueva, la columna sigue con las páginas que ya tenía y
 *   ofrece reintentar.
 */
const useBoardColumnBatches = (
  params: Record<string, string>,
  estatus: number,
  batches: number,
) => {
  const queryClient = useQueryClient();
  const key = quoteBoardColumnBatchesQueryKey(params, estatus, batches);
  const previousKey = quoteBoardColumnBatchesQueryKey(params, estatus, batches - 1);
  const query = useGuardedQuery(
    {
      queryKey: key,
      enabled: batches > 0,
      placeholderData: keepPreviousData,
      queryFn: async (): Promise<QuoteListResponse[]> => {
        const isRefetch = queryClient.getQueryData(key) !== undefined;
        const reused = isRefetch ? [] : (queryClient.getQueryData<QuoteListResponse[]>(previousKey) ?? []);
        const missing = batchOffsets(batches).slice(reused.length);
        const fetched = await Promise.all(
          missing.map((offset) =>
            getQuotesPage({ ...params, estatus: String(estatus), limit: QUOTE_BOARD_BATCH_SIZE, offset }),
          ),
        );
        return [...reused, ...fetched];
      },
    },
    {
      toastId: `quote-board-column-${estatus}-refetch-error`,
      errorMessage: "No se pudieron actualizar las cotizaciones de una columna. Se muestran las anteriores.",
    },
  );
  const isLoadingMore = batches > 0 && query.isFetching && (query.isPlaceholderData || !query.data);
  const loadMoreFailed = batches > 0 && query.isInitialError && !query.isFetching;
  // Con la tanda nueva fallida, las que ya estaban (llave anterior).
  const pages =
    query.data ??
    (loadMoreFailed ? queryClient.getQueryData<QuoteListResponse[]>(previousKey) : undefined) ??
    [];
  return {
    pages: batches > 0 ? pages : [],
    isLoadingMore,
    loadMoreFailed,
    retry: () => void query.refetch(),
  };
};

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

  // Una consulta por columna, en el orden fijo de `KANBAN_COLUMNS` (5
  // llamadas explícitas: las reglas de los hooks no admiten un bucle).
  const extra1 = useBoardColumnBatches(params, KANBAN_COLUMNS[0].estatus, batches[KANBAN_COLUMNS[0].estatus] ?? 0);
  const extra2 = useBoardColumnBatches(params, KANBAN_COLUMNS[1].estatus, batches[KANBAN_COLUMNS[1].estatus] ?? 0);
  const extra3 = useBoardColumnBatches(params, KANBAN_COLUMNS[2].estatus, batches[KANBAN_COLUMNS[2].estatus] ?? 0);
  const extra4 = useBoardColumnBatches(params, KANBAN_COLUMNS[3].estatus, batches[KANBAN_COLUMNS[3].estatus] ?? 0);
  const extra5 = useBoardColumnBatches(params, KANBAN_COLUMNS[4].estatus, batches[KANBAN_COLUMNS[4].estatus] ?? 0);
  const extras = [extra1, extra2, extra3, extra4, extra5];

  const addBatch = (estatus: number) =>
    setExtra((current) => {
      const base = current.key === paramsKey ? current.batches : {};
      return { key: paramsKey, batches: { ...base, [estatus]: (base[estatus] ?? 0) + 1 } };
    });

  const columns: QuoteBoardColumnState[] = KANBAN_COLUMNS.map((config, index) => {
    const column =
      board.data?.columnas.find((candidate) => candidate.estatus === config.estatus) ?? EMPTY_COLUMN;
    const more = extras[index];
    const rows = mergeBoardColumnRows(column.results, more.pages);
    return {
      estatus: config.estatus,
      total: column.total,
      rows,
      canLoadMore: rows.length < column.total && !more.isLoadingMore && !more.loadMoreFailed,
      isLoadingMore: more.isLoadingMore,
      loadMoreFailed: more.loadMoreFailed,
      loadMore: () => addBatch(config.estatus),
      retryLoadMore: more.retry,
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
    const previousPages = queryClient.getQueriesData<QuoteListResponse[]>({ queryKey: sourcePagesKey });
    if (previousBoard) {
      queryClient.setQueryData<QuoteBoard>(
        boardKey,
        moveQuoteInBoard(previousBoard, quote, sourceEstatus, target),
      );
    }
    queryClient.setQueriesData<QuoteListResponse[]>({ queryKey: sourcePagesKey }, (pages) =>
      pages?.map((page) => removeQuoteFromPage(page, quote.id) ?? page),
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
