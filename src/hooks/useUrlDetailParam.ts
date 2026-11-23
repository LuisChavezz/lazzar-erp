"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import { urlWithoutSearchParam } from "@/src/utils/removeSearchParam";

interface UseUrlDetailParamOptions {
  /** Parámetro de la query que lleva el id (`?solicitud=12`). */
  param: string;
  /** `true` cuando el listado ya llegó (vacío incluido). */
  hasLoaded: boolean;
  /** ¿El listado COMPLETO cargado contiene ese id? */
  hasRow: (id: number) => boolean;
  /**
   * Refetch del listado. Se llama UNA vez cuando el id no está en la caché:
   * puede ser un registro creado después de la última carga (la notificación
   * que trae aquí es justamente un aviso de algo nuevo).
   */
  refetch: () => Promise<{ data?: ReadonlyArray<{ id: number }>; isError: boolean }>;
  /** Aviso si el id tampoco está tras el refetch (borrado, de otra empresa…). */
  notFoundMessage: string;
  /** `id` del toast, para que un doble render no lo duplique. */
  toastId: string;
}

/**
 * Abre el diálogo de detalle de un listado desde la URL (`?<param>=<id>`), la
 * vía con la que una notificación lleva a un registro concreto sin ruta
 * `[id]` propia.
 *
 * - Lee el id con `useSearchParams` (la página que monta el listado necesita
 *   un `<Suspense>`). Un valor que no es entero positivo se ignora.
 * - `urlDetailId` es ese id SOLO cuando el listado cargado lo contiene; el
 *   listado decide su diálogo con `detailTargetId ?? urlDetailId`.
 * - Si el listado cargó y el id no está, refetchea una vez; si sigue sin
 *   estar, avisa con `notFoundMessage` y quita el parámetro. Un refetch
 *   fallido ya lo avisa el propio listado: solo se quita el parámetro.
 * - `clear()` (al cerrar el diálogo) quita el parámetro con
 *   `history.replaceState`: cerrar no es navegar, así que no deja una entrada
 *   en el historial. Mientras la URL se pone al día, el id ya descartado no
 *   reabre el diálogo.
 */
export function useUrlDetailParam({
  param,
  hasLoaded,
  hasRow,
  refetch,
  notFoundMessage,
  toastId,
}: UseUrlDetailParamOptions) {
  const searchParams = useSearchParams();
  const urlId = parsePositiveId(searchParams.get(param));

  // Id ya cerrado cuya URL aún no se actualiza. Vuelve a `null` en cuanto la
  // URL deja de traerlo, así que la siguiente llegada del MISMO id sí abre.
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  if (dismissedId !== null && urlId !== dismissedId) setDismissedId(null);

  const isPresent = urlId !== null && hasLoaded && hasRow(urlId);
  const isMissing = urlId !== null && hasLoaded && !hasRow(urlId);
  const urlDetailId = isPresent && urlId !== dismissedId ? urlId : null;

  const removeParam = () => {
    const next = urlWithoutSearchParam(window.location.pathname, window.location.search, param);
    if (next !== null) window.history.replaceState(null, "", next);
  };

  const clear = () => {
    if (urlId !== null) setDismissedId(urlId);
    removeParam();
  };

  // Id ya verificado contra el servidor: el refetch corre una sola vez por id.
  const checkedIdRef = useRef<number | null>(null);

  const verifyMissing = useEffectEvent((id: number) => {
    if (checkedIdRef.current === id) return;
    checkedIdRef.current = id;
    void refetch().then((result) => {
      if (result.isError) {
        removeParam();
        return;
      }
      if (result.data?.some((row) => row.id === id)) return;
      toast.error(notFoundMessage, { id: toastId });
      removeParam();
    });
  });

  useEffect(() => {
    if (urlId === null) {
      checkedIdRef.current = null;
      return;
    }
    if (isMissing) verifyMissing(urlId);
  }, [urlId, isMissing]);

  return { urlDetailId, clear };
}
