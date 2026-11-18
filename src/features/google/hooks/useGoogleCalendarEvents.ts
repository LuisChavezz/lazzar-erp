import { useMemo } from "react";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { GoogleEventsResponse } from "../interfaces/google.interface";
import { googleGetCalendarEvents } from "../services/actions";
import { fetchAllCalendarEventPages } from "../utils/fetchAllCalendarEventPages";

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
}

/**
 * Consulta los eventos del Google Calendar del usuario autenticado.
 *
 * Por defecto carga un rango de 2 meses atrás hasta 6 meses hacia adelante.
 * Trae TODAS las páginas del rango (`fetchAllCalendarEventPages`): con más de
 * 250 eventos, antes se perdían los siguientes.
 */
export const useGoogleCalendarEvents = ({
  timeMin,
  timeMax,
  maxResults = 250,
  enabled = true,
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
    () => ({
      timeMin: timeMin ?? defaultTimeMin,
      timeMax: timeMax ?? defaultTimeMax,
      maxResults: String(maxResults),
    }),
    [timeMin, timeMax, maxResults, defaultTimeMin, defaultTimeMax],
  );

  // `useGuardedQuery`: un refetch fallido conserva los eventos ya pintados y
  // avisa por toast; solo una carga inicial fallida es `isInitialError`, que
  // la pantalla muestra como error con "Reintentar" (antes, un calendario vacío).
  const { data, isLoading, isFetching, isInitialError, error, refetch } =
    useGuardedQuery<GoogleEventsResponse>(
      {
        queryKey: ["google", "calendar", "events", params],
        queryFn: () =>
          fetchAllCalendarEventPages((pageToken) =>
            googleGetCalendarEvents(pageToken ? { ...params, pageToken } : params),
          ),
        enabled,
      },
      {
        toastId: "google-calendar-events",
        errorMessage: "No se pudo actualizar el calendario.",
      },
    );

  return { data, isLoading, isFetching, isInitialError, error, refetch };
};
