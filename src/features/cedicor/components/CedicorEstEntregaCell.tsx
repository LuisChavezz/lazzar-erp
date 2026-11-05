"use client";

import { useClientNow } from "@/src/hooks/useClientNow";
import { formatShortDate } from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";

interface CedicorEstEntregaCellProps {
  /** `fecha_estimada_entrega` de la orden (ISO) o `null`. */
  value: string | null;
  /** Una orden ya despachada a confección nunca se marca vencida. */
  despachada: boolean;
}

/**
 * Celda "Est. Entrega" de las dos listas de Cedicor: la fecha, en rojo si ya
 * pasó. "Ya pasó" se compara con la hora del navegador vía `useClientNow`, así
 * que el HTML prerenderizado y la hidratación pintan la fecha neutra y el rojo
 * aparece después de montar (EC-773).
 */
export function CedicorEstEntregaCell({ value, despachada }: CedicorEstEntregaCellProps) {
  const now = useClientNow();

  if (!value) return <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>;

  const fecha = new Date(value);
  const vencida = now !== null && fecha.getTime() < now && !despachada;

  return (
    <span
      className={`text-xs whitespace-nowrap ${
        vencida
          ? 'text-red-500 dark:text-red-400 font-semibold'
          : 'text-slate-600 dark:text-slate-400'
      }`}
    >
      {formatShortDate(fecha, { timeZone: MEXICO_TIME_ZONE })}
    </span>
  );
}
