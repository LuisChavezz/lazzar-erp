import { formatShortDateTime } from "@/src/utils/formatDate";

/**
 * Sello del servidor (datetime con offset, p. ej. `-06:00`) como
 * "30 sep 2026 · 11:52 a.m." en la zona de México (la de `formatShortDateTime`).
 * Sin `timeZone: "UTC"`: es un instante real, no una fecha-calendario.
 */
export const formatCriticalPathDateTime = (value: string | null | undefined): string =>
  formatShortDateTime(value);
