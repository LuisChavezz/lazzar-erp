"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { hashKey, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { Opportunity } from "../interfaces/opportunity.interface";
import type { OpportunityOnboarding } from "../interfaces/opportunity-onboarding.interface";
import { getOpportunity, getOpportunityOnboarding } from "../services/actions";
import {
  INITIAL_STALE_NOTICE_MEMORY,
  getStaleNoticeForFrame,
  nextStaleNoticeMemory,
  type LiveOpportunityView,
  type OpportunityDialogAction,
  type StaleNoticeFrame,
} from "../utils/opportunityLiveState";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import { opportunityDetailKey, opportunityRecordKey } from "./useOpportunityDetail";

interface UseOpportunityStaleNoticeParams {
  action: OpportunityDialogAction;
  /** Oportunidad del diálogo; `null` = cerrado. */
  opportunityId: number | null;
  /**
   * La acción propia está en vuelo: la mutación O su candado síncrono. El
   * candado sigue tomado hasta que el diálogo se cerró por su resultado; la
   * mutación deja de estar pendiente un render antes.
   */
  isBusy: boolean;
  /** Cierra el diálogo (quien lo monta pone su registro en `null`). */
  onClose: () => void;
}

/** Solo lo que miran los avisos, desde cualquiera de las dos lecturas. */
const recordView = (record: Opportunity): LiveOpportunityView => ({ estado: record.estado });
const detailView = (detail: OpportunityOnboarding): LiveOpportunityView => ({
  estado: detail.oportunidad.estado,
  cotizaciones: detail.cotizaciones,
});

/**
 * Aviso de fila obsoleta de un diálogo de acción de oportunidad (ver
 * `getOpportunityStaleNotice`): al ABRIR el diálogo relee la oportunidad y, si
 * ya no existe o ya no admite la acción, cierra el diálogo con un toast.
 *
 * - Qué relee: el REGISTRO (`GET …/{id}/`, `opportunityRecordKey`) para dar de
 *   baja, transferir y ligar, que solo necesitan saber si existe y su
 *   `estado`; el DETALLE (`…/onboarding/`, la llave de la página) para quitar,
 *   que necesita las cotizaciones ligadas.
 * - Verificación SILENCIOSA (`silent`): un fallo que no sea 404 no dice nada
 *   de la oportunidad y no se avisa; lo decide el backend al enviar.
 * - `staleTime: 0`: el observador queda montado y pasa de deshabilitado a
 *   habilitado al abrir, así que relee aunque haya algo en caché.
 * - Solo cuenta lo resuelto DESPUÉS de abrir y nada mientras la acción propia
 *   viaja (`nextStaleNoticeMemory`, `getStaleNoticeForFrame`, puras y
 *   probadas).
 * - El toast y el cierre van en un EFECTO (cerrar cambia el estado del dueño);
 *   el `id` del toast es la `key` del aviso, así un render repetido no lo
 *   duplica. Con el aviso se relee lo de oportunidades (listado, embudo,
 *   recientes) para que la fila obsoleta salga o se actualice; lo que se acaba
 *   de leer, no.
 */
export function useOpportunityStaleNotice({
  action,
  opportunityId,
  isBusy,
  onClose,
}: UseOpportunityStaleNoticeParams) {
  const queryClient = useQueryClient();
  const open = opportunityId !== null;
  const usesDetail = action.kind === "quitar";
  const id = opportunityId ?? 0;
  const queryKey = usesDetail ? opportunityDetailKey(id) : opportunityRecordKey(id);

  useGuardedQuery<Opportunity | OpportunityOnboarding>(
    {
      queryKey,
      queryFn: () => (usesDetail ? getOpportunityOnboarding(id) : getOpportunity(id)),
      enabled: open && !isBusy,
      staleTime: 0,
      retry: retryUnlessClientError,
    },
    {
      toastId: "opportunity-live-state",
      silent: true,
      isDefinitiveError: isNotFoundError,
    }
  );

  // Solo los eventos de ESTA consulta (como `useLiveQuoteStatus`).
  const queryHash = hashKey(queryKey);
  const queryState = useSyncExternalStore(
    (onChange) =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.query.queryHash === queryHash) onChange();
      }),
    () => queryClient.getQueryState<Opportunity | OpportunityOnboarding>(queryKey),
    () => undefined
  );

  const frame: StaleNoticeFrame<Opportunity | OpportunityOnboarding> = {
    open,
    isBusy,
    state: queryState && {
      dataUpdateCount: queryState.dataUpdateCount,
      errorUpdateCount: queryState.errorUpdateCount,
      dataUpdatedAt: queryState.dataUpdatedAt,
      errorUpdatedAt: queryState.errorUpdatedAt,
      data: queryState.data,
      isNotFound: queryState.status === "error" && isNotFoundError(queryState.error),
    },
  };

  // Contadores al abrir: se actualizan EN el render de la transición (como
  // `useDialogSession`), así el primer render abierto ya los compara.
  const [memory, setMemory] = useState(INITIAL_STALE_NOTICE_MEMORY);
  const nextMemory = nextStaleNoticeMemory(memory, frame);
  if (nextMemory !== memory) setMemory(nextMemory);

  const notice = getStaleNoticeForFrame({
    frame,
    memory: nextMemory,
    action,
    opportunityId,
    toView: (data) =>
      usesDetail ? detailView(data as OpportunityOnboarding) : recordView(data as Opportunity),
  });
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
