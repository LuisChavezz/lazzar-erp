import { formatShortDate } from "@/src/utils/formatDate";

/**
 * Fecha de calendario del desglose ("YYYY-MM-DD") como "07 oct 2026", en UTC
 * para que el día no se corra según la zona horaria del navegador. "—" si
 * falta.
 */
export const formatInvoiceDate = (value: string | null): string =>
  formatShortDate(value, { timeZone: "UTC" });
