import { useMemo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { defaultQueryRetry } from "@/src/utils/defaultQueryRetry";
import { GoogleEventsResponse } from "../interfaces/google.interface";
import { googleGetCalendarEvents } from "../services/actions";
import {
  CalendarEventsPaginationError,
  fetchAllCalendarEventPages,
} from "../utils/fetchAllCalendarEventPages";
import { googleCalendarEventsQueryKey, toCalendarEventsParams } from "../utils/calendarRange";

interface UseGoogleCalendarEventsOptions {
  /** Inicio del rango de tiempo en formato ISO 8601. Por defecto: 2 meses atrás. */
  timeMin?: string;
  /** Fin del rango de tiempo en formato ISO 8601. Por defecto: 6 meses hacia adelante. */
  timeMax?: string;
  /**
   * Eventos por PÁGINA (el backend acepta hasta 250). La consulta sigue
   * `nextPageToken` hasta traer todos los eventos de la ventana.
   */
  maxResults?: number;
  /** Si es false, la query no se ejecuta. Por defecto: true. */
  enabled?: boolean;
  /**
   * Conserva los eventos del rango anterior mientras carga uno nuevo (el
   * calendario al navegar entre meses): sin parpadeo en blanco. Mientras tanto
   * `isPlaceholderData` es `true`.
   */
  keepPreviousRange?: boolean;
}

/**
 * `retry` de los eventos: un error de paginación (demasiadas páginas, token
 * repetido) es determinista, y reintentarlo solo repetiría toda la cadena. El
 * resto sigue al global (`defaultQueryRetry`, que no reintenta un timeout).
 */
export const retryCalendarEvents = (failureCount: number, error: unknown): boolean =>
  !(error instanceof CalendarEventsPaginationError) && defaultQueryRetry(failureCount, error);

/**
 * Consulta los eventos del Google Calendar del usuario autenticado.
 *
 * Por defecto carga un rango de 2 meses atrás hasta 6 meses hacia adelante
 * (lo usa «Próximos eventos»). El calendario pasa su rango VISIBLE
 * (`timeMin`/`timeMax`, ver `calendarRange.ts`), así que cada mes o día
 * navegado es una consulta propia, en caché por rango.
 * Trae TODAS las páginas del rango (`fetchAllCalendarEventPages`): con más de
 * 250 eventos, antes se perdían los siguientes.
 */
export const useGoogleCalendarEvents = ({
  timeMin,
  timeMax,
  maxResults = 250,
  enabled = true,
  keepPreviousRange = false,
}: UseGoogleCalendarEventsOptions = {}) => {
  // Ventana de tiempo por defecto — estable por sesión gracias a deps vacías
  const defaultTimeMin = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const defaultTimeMax = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, []);

  const params = useMemo<Record<string, string>>(
    () =>
      toCalendarEventsParams(
        { timeMin: timeMin ?? defaultTimeMin, timeMax: timeMax ?? defaultTimeMax },
        maxResults,
      ),
    [timeMin, timeMax, maxResults, defaultTimeMin, defaultTimeMax],
  );

  // `useGuardedQuery`: un refetch fallido conserva los eventos ya pintados y
  // avisa por toast; solo una carga inicial fallida es `isInitialError`, que
  // la pantalla muestra como error con "Reintentar" (antes, un calendario vacío).
  const { data, isLoading, isFetching, isPlaceholderData, isInitialError, error, refetch } =
    useGuardedQuery<GoogleEventsResponse>(
      {
        queryKey: googleCalendarEventsQueryKey(params),
        placeholderData: keepPreviousRange ? keepPreviousData : undefined,
        queryFn: ({ signal }) =>
          fetchAllCalendarEventPages(
            (pageToken, pageSignal) =>
              googleGetCalendarEvents(pageToken ? { ...params, pageToken } : params, pageSignal),
            { signal },
          ),
        retry: retryCalendarEvents,
        enabled,
      },
      {
        toastId: "google-calendar-events",
        errorMessage: "No se pudo actualizar el calendario.",
      },
    );

  return { data, isLoading, isFetching, isPlaceholderData, isInitialError, error, refetch };
};
