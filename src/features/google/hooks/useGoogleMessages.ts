"use client";

import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";
import { googleGetEmailMessages } from "../services/actions";
import type {
  GoogleEmailMessage,
  GoogleEmailMessagesResponse,
} from "../interfaces/google.interface";

// --- Tipos públicos del hook ---

export interface useGoogleMessagesReturn {
  /** Mensajes de la página actual */
  messages: GoogleEmailMessage[];
  /** Verdadero mientras se carga la primera página (sin datos en caché) */
  isPending: boolean;
  /** Verdadero durante cualquier fetching, incluido el cambio de página con placeholderData */
  isFetching: boolean;
  /** Verdadero si existe una página siguiente */
  hasNextPage: boolean;
  /** Verdadero si existe una página anterior */
  hasPreviousPage: boolean;
  /** Número de página actual (basado en 1) */
  currentPage: number;
  /** Reinicia la paginación a la primera página */
  fetchFirst: () => void;
  /** Fuerza una re-petición de la página actual (ignorando caché) */
  refetch: () => void;
  /** Navega a la página siguiente */
  goToNextPage: () => void;
  /** Navega a la página anterior */
  goToPreviousPage: () => void;
}

// --- Params base ---

const BASE_PARAMS: Record<string, string> = {
  maxResults: "20",
  q: "in:inbox",
};

// --- Hook ---

/**
 * Hook para obtener los mensajes de Gmail del usuario autenticado.
 *
 * Reemplaza la implementación anterior basada en `useMutation` por `useQuery`,
 * ganando caché automático, deduplicación de peticiones y `keepPreviousData`
 * para transiciones de página sin flashes de contenido vacío.
 *
 * Paginación bidireccional mediante historial de pageTokens:
 * - `pageTokenHistory[i]` es el token usado para obtener la página i+1.
 * - Cambiar el historial cambia la queryKey y dispara una nueva petición.
 */
export const useGoogleMessages = (): useGoogleMessagesReturn => {
  /**
   * Historial de pageTokens usados para llegar a cada página.
   * - El índice 0 es siempre `undefined` (primera página, sin token).
   * - Agregar un elemento = avanzar a la siguiente página.
   * - Quitar el último = retroceder a la página anterior.
   */
  const [pageTokenHistory, setPageTokenHistory] = useState<Array<string | undefined>>([
    undefined,
  ]);

  const currentToken = pageTokenHistory[pageTokenHistory.length - 1];

  const { data, isPending, isFetching, isError, error, refetch } = useQuery<GoogleEmailMessagesResponse>({
    queryKey: ["google", "email-messages", currentToken ?? "first"],
    queryFn: () => {
      const params: Record<string, string> = { ...BASE_PARAMS };
      if (currentToken) params.pageToken = currentToken;
      return googleGetEmailMessages(params);
    },
    staleTime: 2 * 60 * 1000,
    // Mantiene los datos de la página anterior visibles mientras se carga la nueva.
    placeholderData: keepPreviousData,
  });

  // Muestra toast de error sin interrumpir el árbol de componentes.
  useEffect(() => {
    if (!isError || !error) return;
    const axiosData = (error as AxiosError<{ error?: string }>)?.response?.data;
    const message =
      axiosData?.error ??
      (error instanceof Error ? error.message : "No se pudieron cargar los correos.");
    toast.error(message);
  }, [isError, error]);

  /** Reinicia la paginación a la primera página. */
  const fetchFirst = () => {
    setPageTokenHistory([undefined]);
  };

  /** Avanza a la página siguiente usando el nextPageToken actual. */
  const goToNextPage = () => {
    const nextToken = data?.nextPageToken;
    if (!nextToken) return;
    setPageTokenHistory((prev) => [...prev, nextToken]);
  };

  /** Retrocede a la página anterior quitando el último token del historial. */
  const goToPreviousPage = () => {
    if (pageTokenHistory.length <= 1) return;
    setPageTokenHistory((prev) => prev.slice(0, -1));
  };

  return {
    messages: data?.messages ?? [],
    isPending,
    isFetching,
    hasNextPage: !!data?.nextPageToken,
    hasPreviousPage: pageTokenHistory.length > 1,
    currentPage: pageTokenHistory.length,
    fetchFirst,
    refetch,
    goToNextPage,
    goToPreviousPage,
  };
};
