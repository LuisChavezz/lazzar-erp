"use client";

import { useQuery } from "@tanstack/react-query";
import { googleGetEmailMessageById } from "../services/actions";
import type { GoogleEmailMessageDetail } from "../interfaces/google.interface";

// --- Clave de consulta exportada para prefetch ---

/**
 * Clave canónica de la query de detalle de un mensaje.
 * Exportada para reutilizarla en prefetchQuery desde EmailListItem.
 */
export const googleMessageQueryKey = (messageId: string) =>
  ["google", "email-message", messageId] as const;

// --- Hook ---

/**
 * Hook para obtener el detalle completo de un correo por su ID.
 *
 * Cachea el resultado durante 5 minutos. El caché es compartido con el
 * prefetchQuery que se lanza al hacer hover sobre un ítem de la lista,
 * por lo que abrir un mensaje ya sobrevolado es instantáneo.
 *
 * @param messageId - ID del mensaje de Gmail. La query se deshabilita si es undefined.
 */
export const useGoogleMessage = (messageId: string | undefined) => {
  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: googleMessageQueryKey(messageId ?? ""),
    queryFn: () => googleGetEmailMessageById(messageId!),
    enabled: !!messageId,
    staleTime: 5 * 60 * 1000,
    // Extrae el objeto `email` directamente del wrapper de respuesta.
    select: (res) => res.email,
  });

  return {
    detail: data as GoogleEmailMessageDetail | undefined,
    isPending,
    isFetching,
    isError,
  };
};
