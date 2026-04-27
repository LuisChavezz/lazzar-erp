import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoogleEventsResponse } from "../interfaces/google.interface";
import { googleGetCalendarEvents } from "../services/actions";

interface UseGoogleCalendarEventsOptions {
  /** Inicio del rango de tiempo en formato ISO 8601. Por defecto: 2 meses atrás. */
  timeMin?: string;
  /** Fin del rango de tiempo en formato ISO 8601. Por defecto: 6 meses hacia adelante. */
  timeMax?: string;
  /** Número máximo de eventos a recuperar. Por defecto: 250. */
  maxResults?: number;
  /** Si es false, la query no se ejecuta. Por defecto: true. */
  enabled?: boolean;
}

/**
 * Consulta los eventos del Google Calendar del usuario autenticado.
 *
 * Por defecto carga un rango de 2 meses atrás hasta 6 meses hacia adelante,
 * con un stale time de 5 minutos para evitar peticiones excesivas al navegar.
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

  return useQuery<GoogleEventsResponse>({
    queryKey: ["google", "calendar", "events", params],
    queryFn: () => googleGetCalendarEvents(params),
    enabled,
  });
};
