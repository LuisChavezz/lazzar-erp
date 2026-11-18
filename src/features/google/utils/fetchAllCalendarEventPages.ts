import type { GoogleCalendarEvent, GoogleEventsResponse } from "../interfaces/google.interface";

/**
 * Tope de páginas por consulta. El backend limita `maxResults` a 250 por
 * página (`/ai/google/calendar/events/`), así que son hasta 5000 eventos en la
 * ventana del calendario: un tope de seguridad, no un límite esperado.
 */
export const MAX_CALENDAR_EVENT_PAGES = 20;

/** Error de una consulta que no terminó de paginar: nunca se muestra a medias. */
export class CalendarEventsPaginationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarEventsPaginationError";
  }
}

/**
 * Pide TODAS las páginas de eventos de una ventana de tiempo, siguiendo
 * `nextPageToken` hasta que el backend deja de enviarlo, y las une en una sola
 * respuesta. Antes solo se leía la primera página, y los eventos después del
 * 250 se perdían sin aviso.
 *
 * Nunca devuelve un resultado parcial: si una página falla, la promesa rechaza
 * con ese error; si se rebasa `maxPages` o el backend repite un token (lo que
 * sería un bucle), rechaza con `CalendarEventsPaginationError`. La pantalla
 * muestra entonces el estado de error en vez de un calendario incompleto.
 */
export const fetchAllCalendarEventPages = async (
  fetchPage: (pageToken: string | undefined) => Promise<GoogleEventsResponse>,
  maxPages: number = MAX_CALENDAR_EVENT_PAGES,
): Promise<GoogleEventsResponse> => {
  const events: GoogleCalendarEvent[] = [];
  const seenTokens = new Set<string>();
  let pageToken: string | undefined;
  let ok = true;

  for (let page = 0; page < maxPages; page += 1) {
    const response = await fetchPage(pageToken);
    ok = ok && response.ok !== false;
    events.push(...(response.events ?? []));

    const next = response.nextPageToken || undefined;
    if (!next) return { ok, events };
    if (seenTokens.has(next)) {
      throw new CalendarEventsPaginationError("El calendario devolvió una página repetida.");
    }
    seenTokens.add(next);
    pageToken = next;
  }

  throw new CalendarEventsPaginationError(
    "El calendario tiene demasiados eventos en este periodo para mostrarlos completos.",
  );
};
