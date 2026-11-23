"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import toast from "react-hot-toast";
import { urlWithoutSearchParam } from "@/src/utils/removeSearchParam";
import { decideUrlDetail, isCurrentUrlDetailId } from "@/src/utils/urlDetailParamDecision";

interface UseUrlDetailParamOptions {
  /** Parámetro de la query que lleva el id (`?solicitud=12`). */
  param: string;
  /** `true` cuando el listado ya llegó (vacío incluido). */
  hasLoaded: boolean;
  /** `dataUpdatedAt` de la consulta del listado. */
  dataUpdatedAt: number;
  /** ¿El listado COMPLETO cargado contiene ese id? */
  hasRow: (id: number) => boolean;
  /**
   * Refetch del listado, para un id que no está en una caché anterior al
   * parámetro: puede ser un registro creado después de la última carga (la
   * notificación que trae aquí es justamente un aviso de algo nuevo).
   */
  refetch: () => Promise<{ isError: boolean }>;
  /** Aviso si el id no está en el listado fresco (borrado, de otra empresa…). */
  notFoundMessage: string;
  /** `id` del toast, para que un doble render no lo duplique. */
  toastId: string;
}

/** Valor crudo del parámetro y cuándo se vio por primera vez. */
interface SeenParam {
  raw: string | null;
  seenAt: number;
}

const readCurrentParam = (param: string) =>
  new URLSearchParams(window.location.search).get(param);

/**
 * Abre el diálogo de detalle de un listado desde la URL (`?<param>=<id>`), la
 * vía con la que una notificación lleva a un registro concreto sin ruta
 * `[id]` propia.
 *
 * - El parámetro lo lee `SearchParamReader` (con `useSearchParams`), que el
 *   listado monta en su propio `<Suspense fallback={null}>` con `readerProps`:
 *   así el listado sigue prerenderizándose con su estado de carga.
 * - La decisión es pura (`decideUrlDetail`): `urlDetailId` es el id SOLO
 *   cuando el listado cargado lo contiene; el listado decide su diálogo con
 *   `detailTargetId ?? urlDetailId`.
 * - Un id que no está se refetchea una vez solo si la caché es ANTERIOR al
 *   parámetro; si no está en un listado fresco, se avisa y se quita. Un
 *   parámetro inválido se quita sin aviso. Todo se escribe con
 *   `history.replaceState`: no deja entradas en el historial.
 * - `clear()` (al cerrar el diálogo) quita el parámetro. Mientras la URL se
 *   pone al día, el id ya descartado no reabre el diálogo.
 */
export function useUrlDetailParam({
  param,
  hasLoaded,
  dataUpdatedAt,
  hasRow,
  refetch,
  notFoundMessage,
  toastId,
}: UseUrlDetailParamOptions) {
  const [seen, setSeen] = useState<SeenParam>({ raw: null, seenAt: 0 });
  const onParamChange = (raw: string | null) => setSeen({ raw, seenAt: Date.now() });

  // Id ya cerrado cuya URL aún no se actualiza. Vuelve a `null` en cuanto la
  // URL deja de traerlo, así que la siguiente llegada del MISMO id sí abre.
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  const decision = decideUrlDetail({
    raw: seen.raw,
    seenAt: seen.seenAt,
    hasLoaded,
    dataUpdatedAt,
    hasRow,
    dismissedId,
  });
  if (dismissedId !== null && decision.id !== dismissedId) setDismissedId(null);

  const removeParam = () => {
    const next = urlWithoutSearchParam(window.location.pathname, window.location.search, param);
    if (next !== null) window.history.replaceState(null, "", next);
  };

  const clear = () => {
    if (decision.id !== null) setDismissedId(decision.id);
    removeParam();
  };

  // Id ya refetcheado: la verificación corre una sola vez por aparición.
  const verifiedIdRef = useRef<number | null>(null);

  const act = useEffectEvent(() => {
    const { id, action } = decision;
    if (id === null) verifiedIdRef.current = null;
    if (action === "remove-invalid") {
      removeParam();
    } else if (action === "not-found") {
      toast.error(notFoundMessage, { id: toastId });
      removeParam();
    } else if (action === "verify" && id !== null && verifiedIdRef.current !== id) {
      verifiedIdRef.current = id;
      // Con éxito, el listado llega con un `dataUpdatedAt` nuevo y la decisión
      // pasa sola a abrir o a `not-found`. Un fallo ya lo avisa el listado:
      // solo se quita el parámetro, y nunca uno que ya no sea este id.
      void refetch().then((result) => {
        if (result.isError && isCurrentUrlDetailId(id, readCurrentParam(param))) removeParam();
      });
    }
  });

  useEffect(() => {
    act();
  }, [seen.raw, decision.id, decision.action]);

  return {
    urlDetailId: decision.urlDetailId,
    clear,
    readerProps: { param, onChange: onParamChange },
  };
}
