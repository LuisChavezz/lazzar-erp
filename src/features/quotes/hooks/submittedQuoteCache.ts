import type { QueryClient } from "@tanstack/react-query";
import { patchCachedRowById } from "@/src/utils/cachedRows";
import { KANBAN_COLUMNS } from "../constants/kanbanColumns";
import { QUOTES_QUERY_KEY } from "../constants/quotesQueryKeys";
import type { Quote, QuoteSubmitForReviewResponse } from "../interfaces/quote.interface";
import type { QuoteBoard, QuoteListResponse } from "../interfaces/quote-list.interface";
import {
  findQuoteOutsideColumn,
  moveQuoteInBoard,
  removeQuoteFromPage,
} from "../utils/quoteBoardCache";

const BOARD_KEY = [...QUOTES_QUERY_KEY, "tablero"] as const;
const BOARD_COLUMN_KEY = [...QUOTES_QUERY_KEY, "tablero-columna"] as const;

/**
 * Escribe en la caché el resultado de `enviar-revision/` ANTES de invalidar
 * (EC-927): si ese refetch falla, lista y tablero conservan lo cargado y la
 * cotización ya enviada seguiría como Borrador/Rechazada, con "Enviar a
 * revisión" disponible.
 *
 * La respuesta trae `cotizacion` con `CotizacionSerializer`, NO la fila del
 * listado (`CotizacionDashboardItemSerializer`): solo se copian `estatus` y
 * `updated_at`, y `estatus_label` se toma de `KANBAN_COLUMNS`, como Mesa de
 * Control (`applyOperationsQuoteActionResult`).
 *
 * - Lista (`["quotes", "list", …]`) y recientes (`["quotes", "recientes"]`):
 *   la fila se actualiza en su lugar, en cada página que la tenga.
 * - Tablero (`["quotes", "tablero", params]`): la tarjeta pasa de su columna a
 *   la de destino con `moveQuoteInBoard` (conteos incluidos), y sale de las
 *   páginas de "cargar más" de su columna de origen. Si ya está en la de
 *   destino (el arrastre la movió de forma optimista) o no está cargada, ese
 *   tablero no se toca.
 */
export const applySubmittedQuoteToCache = async (
  queryClient: QueryClient,
  { cotizacion: { id, estatus, updated_at } }: QuoteSubmitForReviewResponse,
) => {
  const label = KANBAN_COLUMNS.find((column) => column.estatus === estatus)?.label;

  // Cancela todo lo de `["quotes"]` en vuelo (traería el estatus anterior);
  // `onSettled` lo vuelve a pedir al invalidar.
  await patchCachedRowById<Quote>(queryClient, QUOTES_QUERY_KEY, id, (row) => ({
    ...row,
    estatus,
    estatus_label: label ?? row.estatus_label,
    updated_at,
  }));

  if (label === undefined) return;
  const columnPages = queryClient.getQueriesData<QuoteListResponse[]>({ queryKey: BOARD_COLUMN_KEY });
  for (const [boardKey, board] of queryClient.getQueriesData<QuoteBoard>({ queryKey: BOARD_KEY })) {
    if (!board) continue;
    // `["quotes", "tablero-columna", params, estatus, tandas]`: las del mismo filtro.
    const params = JSON.stringify(boardKey[BOARD_KEY.length]);
    const sameParams = columnPages.filter(
      ([key]) => JSON.stringify(key[BOARD_COLUMN_KEY.length]) === params,
    );
    const found = findQuoteOutsideColumn(
      board,
      sameParams.map(([key, pages]) => ({ estatus: key[BOARD_COLUMN_KEY.length + 1] as number, pages })),
      id,
      estatus,
    );
    if (!found) continue;
    queryClient.setQueryData<QuoteBoard>(
      boardKey,
      moveQuoteInBoard(board, { ...found.quote, updated_at }, found.sourceEstatus, { estatus, label }),
    );
    for (const [key, pages] of sameParams) {
      if (key[BOARD_COLUMN_KEY.length + 1] !== found.sourceEstatus || !pages) continue;
      queryClient.setQueryData<QuoteListResponse[]>(
        key,
        pages.map((page) => removeQuoteFromPage(page, id) ?? page),
      );
    }
  }
};
