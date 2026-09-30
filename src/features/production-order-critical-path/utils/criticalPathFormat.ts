import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";

/**
 * Sello del servidor (datetime con offset, p. ej. `-06:00`) como
 * "30 sep 2026 · 11:52" en la zona horaria del usuario. Sin `timeZone: "UTC"`:
 * es un instante real, no una fecha-calendario.
 */
export const formatCriticalPathDateTime = (value: string | null | undefined): string =>
  value ? `${formatShortDate(value)} · ${formatShortTime(value)}` : "—";
