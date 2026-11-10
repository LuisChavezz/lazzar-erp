import { parseLocalDate, toLocalDateKey } from "@/src/utils/formatDate";

/**
 * "Fecha Captura" de una cotización existente como "YYYY-MM-DD" (lo que
 * muestra el formulario de edición): el día LOCAL de `created_at`, que el
 * backend sella como datetime con offset (`auto_now_add`).
 *
 * Ni `slice(0, 10)` (toma el día del offset con que llegó, no el local) ni
 * `toISOString()` (día UTC: en México a partir de las 18:00 ya es mañana).
 * Sin `created_at` (o si no parsea) cae en `fallback`, el "hoy" del alta.
 */
export const quoteCaptureDateKey = (
  createdAt: string | null | undefined,
  fallback: string,
): string => {
  const date = parseLocalDate(createdAt);
  return date ? toLocalDateKey(date) : fallback;
};
