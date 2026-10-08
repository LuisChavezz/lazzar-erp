import { parseLocalDate } from "@/src/utils/formatDate";
import { formatPercentageNumber } from "@/src/utils/percentage";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

/**
 * Fecha de los indicadores de OP como "30/09/2026" (es-MX). Pasa por
 * `parseLocalDate`, que distingue los dos tipos que trae el contrato:
 * - fecha-calendario "YYYY-MM-DD" (`fecha_entrega_estimada`): se arma como día
 *   LOCAL; con `new Date()` sería medianoche UTC y en México saldría el día
 *   anterior.
 * - datetime UTC con "T" (`fecha_fin`): `Date` nativo, que respeta su offset, y
 *   se muestra en la zona del usuario.
 * "—" sin valor o si no se puede leer.
 */
export const formatKpiDate = (value: string | null): string => {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("es-MX", DATE_FORMAT) : "—";
};

/** Porcentaje del backend (0–100, 1 decimal) como "25.0%": siempre con su decimal. */
export const formatKpiPct = (value: number): string => `${formatPercentageNumber(value, 1)}%`;

