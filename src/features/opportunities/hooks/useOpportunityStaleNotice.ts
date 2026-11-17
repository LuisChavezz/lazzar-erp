"use client";

import { useEffect, useSyncExternalStore } from "react";
import { hashKey, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { OpportunityOnboarding } from "../interfaces/opportunity-onboarding.interface";
import { getOpportunityOnboarding } from "../services/actions";
import {
  getOpportunityStaleNotice,
  resolveLiveOpportunity,
  type DetailQueryCounts,
  type OpportunityDialogAction,
} from "../utils/opportunityLiveState";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import { opportunityDetailKey } from "./useOpportunityDetail";

const NO_COUNTS: DetailQueryCounts = { dataUpdateCount: 0, errorUpdateCount: 0 };

/**
 * Llave del observador mientras NO verifica (cerrado o con la acción propia en
 * vuelo). No es la del detalle: dar de baja quita el detalle de la caché, y un
 * observador deshabilitado sobre esa llave la volvería a crear en su render,
 * lo que avisa a la página de detalle a media renderización de otro
 * componente. Nunca se consulta (`enabled: false`).
 */
const IDLE_KEY = [...OPPORTUNITIES_KEY, "live-state-idle"] as const;

interface UseOpportunityStaleNoticeParams {
  action: OpportunityDialogAction;
  /** Oportunidad del diálogo; `null` = cerrado. */
  opportunityId: number | null;
  /** La acción propia está en vuelo (el candado): no se verifica ni se avisa. */
  isBusy: boolean;
  /** Cierra el diálogo (quien lo monta pone su registro en `null`). */
  onClose: () => void;
}

/**
 * Aviso de fila obsoleta de un diálogo de acción de oportunidad (ver
 * `getOpportunityStaleNotice`): al ABRIR el diálogo relee el detalle
 * (`GET …/onboarding/`, la misma llave que la página de detalle) y, si la
 * oportunidad ya no existe o ya no admite la acción, cierra el diálogo con un
 * toast.
 *
 * - Verificación SILENCIOSA (`silent`): un fallo que no sea 404 no dice nada
 *   de la oportunidad y no se avisa; lo decide el backend al enviar.
 * - `staleTime: 0`: el observador queda montado y pasa de deshabilitado a
 *   habilitado al abrir, así que relee aunque el detalle esté en caché.
 * - Deshabilitado mientras la acción PROPIA viaja (`isBusy`): dar de baja
 *   quita el detalle de la caché, y volver a pedirlo solo traería un 404
 *   (ver `IDLE_KEY`).
 * - Solo cuenta lo resuelto DESPUÉS de abrir: los contadores de la consulta se
 *   copian al abrir (`useDialogSession`).
 * - El toast y el cierre van en un EFECTO (cerrar cambia el estado del dueño);
 *   el `id` del toast es la `key` del aviso, así un render repetido no lo
 *   duplica. Con el aviso se relee lo de oportunidades (listado, embudo,
 *   recientes) para que la fila obsoleta salga o se actualice; el detalle de
 *   ESTA oportunidad no, porque se acaba de leer.
 */
export function useOpportunityStaleNotice({
  action,
  opportunityId,
  isBusy,
  onClose,
}: UseOpportunityStaleNoticeParams) {
  const queryClient = useQueryClient();
  const open = opportunityId !== null;
  const queryKey = opportunityDetailKey(opportunityId ?? 0);
  const isChecking = open && !isBusy;

  useGuardedQuery<OpportunityOnboarding>(
    {
      queryKey: isChecking ? queryKey : IDLE_KEY,
      queryFn: () => getOpportunityOnboarding(opportunityId as number),
      enabled: isChecking,
      staleTime: 0,
      retry: retryUnlessClientError,
    },
    {
      toastId: "opportunity-live-state",
      silent: true,
      isDefinitiveError: isNotFoundError,
    }
  );

  // Solo los eventos de ESTA consulta (como `useLiveQuoteStatus`), y solo
  // mientras verifica: tras una baja propia la página de detalle vuelve a crear
  // su consulta en SU render, y escuchar ese evento aquí actualizaría este
  // componente a media renderización de otro.
  const queryHash = hashKey(queryKey);
  const state = useSyncExternalStore(
    (onChange) =>
      isChecking
        ? queryClient.getQueryCache().subscribe((event) => {
            if (event.query.queryHash === queryHash) onChange();
          })
        : () => {},
    () => (isChecking ? queryClient.getQueryState<OpportunityOnboarding>(queryKey) : undefined),
    () => undefined
  );

  const currentCounts: DetailQueryCounts = state
    ? { dataUpdateCount: state.dataUpdateCount, errorUpdateCount: state.errorUpdateCount }
    : NO_COUNTS;
  const baseline = useDialogSession(open, currentCounts).snapshot;

  const live = open
    ? resolveLiveOpportunity({
        baseline,
        state: state && {
          dataUpdateCount: state.dataUpdateCount,
          errorUpdateCount: state.errorUpdateCount,
          dataUpdatedAt: state.dataUpdatedAt,
          errorUpdatedAt: state.errorUpdatedAt,
          data: state.data,
          isNotFound: state.status === "error" && isNotFoundError(state.error),
        },
      })
    : undefined;

  const notice = open ? getOpportunityStaleNotice({ action, opportunityId, live, isBusy }) : null;
  const noticeKey = notice?.key;
  const noticeMessage = notice?.message;

  useEffect(() => {
    if (!noticeKey || !noticeMessage) return;
    toast.error(noticeMessage, { id: noticeKey });
    void queryClient.invalidateQueries({
      queryKey: OPPORTUNITIES_KEY,
      predicate: (query) => query.queryHash !== queryHash,
    });
    onClose();
  }, [noticeKey, noticeMessage, onClose, queryClient, queryHash]);
}
