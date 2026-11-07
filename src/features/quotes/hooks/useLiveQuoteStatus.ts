"use client";

import { useSyncExternalStore } from "react";
import { hashKey, useQueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
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
 * Opciones del detalle que lee el estatus vivo: la llave del detalle
 * (`["quote", id, "cotizaciones"]`, la que invalidan las mutaciones y reutiliza
 * "Ver detalle") con `staleTime: 0`. El observador vive montado todo el tiempo
 * en `QuoteRowActionDialogs`, así que `refetchOnMount` no aplica: lo que pide el
 * detalle al abrir es que la consulta pase de deshabilitada (o de otra llave) a
 * habilitada con los datos VENCIDOS. Con el `staleTime` global (15 min) un
 * detalle en caché de hace minutos no se volvía a pedir y el aviso podía no
 * salir. Exportadas para la prueba que lo cubre.
 */
export const getLiveQuoteDetailQueryOptions = (quoteId: number | undefined, enabled: boolean) => ({
  ...getQuoteQueryOptions(quoteId, "cotizaciones"),
  enabled: enabled && quoteId !== undefined,
  staleTime: 0,
});

/**
 * Estatus VIVO de la cotización de un diálogo de fila de Ventas (ver
 * `resolveLiveQuoteStatus`): la fila en lo cargado por la vista y, si
 * `checkDetail`, el detalle `GET /ventas/cotizaciones/{id}/` leído al abrir.
 *
 * Es una verificación SILENCIOSA (`silent`): un fallo que no sea 404/403 no
 * dice nada del estatus y no se avisa (lo decide el backend al enviar). El
 * 404/403 es definitivo (`isDefinitiveError`): no se reintenta. Los instantes
 * (`dataUpdatedAt`, `errorUpdatedAt`) se leen de la caché, como en `useQuote`:
 * lo leído antes de abrir no cuenta.
 *
 * `undefined` sin diálogo; `null` si la cotización ya no existe o ya no es
 * visible.
 */
export const useLiveQuoteStatus = (
  target: LiveQuoteTarget | null,
  loadedRows: readonly Quote[],
  checkDetail: boolean,
): LiveQuoteStatus | undefined => {
  const queryClient = useQueryClient();
  const quoteId = target?.quote.id;
  const options = getLiveQuoteDetailQueryOptions(quoteId, checkDetail);
  const detail = useGuardedQuery(options, {
    toastId: "quote-live-status",
    silent: true,
    isDefinitiveError: isQuoteDetailDefinitiveError,
  });
  // Solo los eventos de ESTA consulta: escuchar toda la caché avisaba también
  // cuando otro componente crea una consulta en su render (los comentarios de
  // "Ver detalle"), y React reportaba un setState durante el render ajeno.
  const queryHash = hashKey(options.queryKey);
  const subscribe = (onChange: () => void) =>
    queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryHash === queryHash) onChange();
    });
  const dataUpdatedAt = useSyncExternalStore(
    subscribe,
    () => queryClient.getQueryState(options.queryKey)?.dataUpdatedAt ?? 0,
    () => 0,
  );
  const errorUpdatedAt = useSyncExternalStore(
    subscribe,
    () => queryClient.getQueryState(options.queryKey)?.errorUpdatedAt ?? 0,
    () => 0,
  );

  if (!target) return undefined;
  const loadedRow = loadedRows.find((row) => row.id === target.quote.id);
  return resolveLiveQuoteStatus({
    snapshotEstatus: target.quote.estatus,
    openedAt: target.openedAt,
    loadedRow,
    detail:
      checkDetail && detail.data
        ? { estatus: detail.data.data.estatus, updatedAt: dataUpdatedAt }
        : undefined,
    detailGoneAt: checkDetail && detail.isDefinitiveError ? errorUpdatedAt : undefined,
  });
};
