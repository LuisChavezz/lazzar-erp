"use client";

import { useQuery } from "@tanstack/react-query";
import { getQuoteQueryOptions } from "./useQuote";
import type { Quote } from "../interfaces/quote.interface";
import { isQuoteDetailDefinitiveError } from "../utils/quoteResource";
import { resolveLiveQuoteStatus, type LiveQuoteStatus } from "../utils/quoteLiveStatus";

interface LiveQuoteTarget {
  /** Foto de la cotización al abrir el diálogo. */
  quote: Quote;
  /** Momento (ms) en que se abrió. */
  openedAt: number;
}

/**
 * Estatus VIVO de la cotización de un diálogo de fila de Ventas (ver
 * `resolveLiveQuoteStatus`): la fila en lo cargado por la vista y, si
 * `checkDetail`, el detalle `GET /ventas/cotizaciones/{id}/` leído al abrir.
 *
 * El detalle se relee en cada apertura (`refetchOnMount: "always"`) y
 * comparte la llave del detalle (`["quote", id, "cotizaciones"]`), así que lo
 * invalidan las mismas mutaciones que al detalle y el diálogo de "Ver" lo
 * reutiliza. Va con `useQuery` directo y no con `useGuardedQuery` porque es
 * una verificación SILENCIOSA que necesita los instantes de la caché
 * (`dataUpdatedAt`, `errorUpdatedAt`): un fallo que no sea 404/403 no dice
 * nada del estatus y no se avisa (lo decide el backend al enviar). El 404/403
 * no se reintenta.
 *
 * `undefined` sin diálogo; `null` si la cotización ya no existe o ya no es
 * visible.
 */
export const useLiveQuoteStatus = (
  target: LiveQuoteTarget | null,
  loadedRows: readonly Quote[],
  checkDetail: boolean,
): LiveQuoteStatus | undefined => {
  const quoteId = target?.quote.id;
  const options = getQuoteQueryOptions(quoteId, "cotizaciones");
  const detail = useQuery({
    ...options,
    enabled: checkDetail && quoteId !== undefined,
    refetchOnMount: "always",
    retry: (failureCount, error) => !isQuoteDetailDefinitiveError(error) && failureCount < 1,
  });

  if (!target) return undefined;
  const loadedRow = loadedRows.find((row) => row.id === target.quote.id);
  const isGoneError = detail.isError && isQuoteDetailDefinitiveError(detail.error);
  return resolveLiveQuoteStatus({
    snapshotEstatus: target.quote.estatus,
    openedAt: target.openedAt,
    loadedRow,
    detail:
      checkDetail && detail.data
        ? { estatus: detail.data.data.estatus, updatedAt: detail.dataUpdatedAt }
        : undefined,
    detailGoneAt: checkDetail && isGoneError ? detail.errorUpdatedAt : undefined,
  });
};
