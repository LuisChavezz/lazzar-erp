import { formatShortDate } from "@/src/utils/formatDate";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Etiqueta relativa en español ("Hace 5 min", "Hace 2 horas", "Hace 3 días").
 * A partir de una semana cae en la fecha absoluta, donde lo relativo deja de
 * informar.
 *
 * `nowMs` se INYECTA a propósito: las utils de fecha del repo nunca leen el
 * reloj por su cuenta (mismo criterio que `picking.utils.ts` y
 * `accounts-receivable.utils.ts`), porque el React Compiler prohíbe
 * `Date.now()` durante el render. La fuente de "ahora" es el `dataUpdatedAt`
 * de la consulta, así que la etiqueta se recalcula cuando se recarga la lista.
 */
export const formatRelativeTime = (
  value: string | null | undefined,
  nowMs: number,
): string => {
  if (!value) return "—";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "—";

  const elapsed = Math.max(0, nowMs - timestamp);

  if (elapsed < MINUTE) return "Hace un momento";

  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `Hace ${minutes} min`;
  }

  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  const days = Math.floor(elapsed / DAY);
  if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`;

  return formatShortDate(value);
};
