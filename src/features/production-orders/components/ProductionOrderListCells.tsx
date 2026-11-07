"use client";

import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { useClientNow } from "@/src/hooks/useClientNow";
import type {
  ProductionOrderListItem,
  RutaCriticaEstado,
  RutaCriticaEtapa,
} from "../interfaces/production-order.interface";

const DASH = <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;

/** Etapas de la ruta crítica en orden (las mismas secciones del diálogo). */
export const RUTA_CRITICA_ETAPAS: { key: RutaCriticaEtapa; label: string }[] = [
  { key: "desarrollo", label: "Desarrollo" },
  { key: "telas_avios", label: "Telas y avíos" },
  { key: "trazo", label: "Trazo" },
  { key: "corte", label: "Corte" },
  { key: "produccion", label: "Producción" },
];

const ESTADO_LABEL: Record<RutaCriticaEstado, string> = {
  pendiente: "pendiente",
  en_proceso: "en proceso",
  completo: "completo",
};

/**
 * Seguimiento de la ruta crítica tipo "rastreador de pedido": cinco puntos
 * unidos por una línea (verde completo, azul en proceso, gris pendiente) y,
 * debajo, la etapa actual con "x/5". Solo informativo.
 */
export function RutaCriticaTracker({ order }: { order: ProductionOrderListItem }) {
  const ruta = order.ruta_critica;
  if (!ruta) return DASH;

  const completas = RUTA_CRITICA_ETAPAS.filter(({ key }) => ruta[key] === "completo").length;
  const actual =
    RUTA_CRITICA_ETAPAS.find(({ key }) => ruta[key] === "en_proceso") ??
    RUTA_CRITICA_ETAPAS.find(({ key }) => ruta[key] !== "completo");
  const resumen = RUTA_CRITICA_ETAPAS.map(({ key, label }) => `${label}: ${ESTADO_LABEL[ruta[key]]}`).join(" · ");

  return (
    <div className="flex flex-col gap-1.5" title={resumen} aria-label={`Ruta crítica. ${resumen}`}>
      <ol className="flex items-center">
        {RUTA_CRITICA_ETAPAS.map(({ key, label }, index) => {
          const estado = ruta[key];
          const dot =
            estado === "completo"
              ? "bg-emerald-500 border-emerald-500"
              : estado === "en_proceso"
                ? "bg-sky-500 border-sky-500 ring-4 ring-sky-500/20"
                : "bg-transparent border-slate-300 dark:border-white/20";
          const prevDone = index > 0 && ruta[RUTA_CRITICA_ETAPAS[index - 1].key] === "completo";
          return (
            <li key={key} className="flex items-center" aria-label={`${label}: ${ESTADO_LABEL[estado]}`}>
              {index > 0 && (
                <span
                  className={`h-0.5 w-4 ${prevDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/10"}`}
                />
              )}
              <span className={`block h-2.5 w-2.5 rounded-full border-2 ${dot}`} />
            </li>
          );
        })}
      </ol>
      <span className="text-[11px] whitespace-nowrap">
        {completas === RUTA_CRITICA_ETAPAS.length ? (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ruta completa</span>
        ) : (
          <>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{actual?.label}</span>{" "}
            <span className="tabular-nums text-slate-400 dark:text-slate-500">
              {completas}/{RUTA_CRITICA_ETAPAS.length}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

/** Centro de confección: el maquilero o "Interno". */
export function CentroConfeccionCell({ order }: { order: ProductionOrderListItem }) {
  if (order.centro_confeccion === undefined) return DASH;
  if (order.centro_confeccion === null) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        Interno
      </span>
    );
  }
  return (
    <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">
      {order.centro_confeccion.nombre}
    </span>
  );
}

/** Fecha simple (`YYYY-MM-DD` o ISO). */
export function FechaCell({ value }: { value: string | null | undefined }) {
  if (value === undefined) return DASH;
  if (!value) return DASH;
  return (
    <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
      {formatShortDate(value.length === 10 ? `${value}T12:00:00Z` : value, { timeZone: MEXICO_TIME_ZONE })}
    </span>
  );
}

/** Fecha de vencimiento: en rojo si ya pasó (después de montar, `useClientNow`). */
export function VenceCell({ value }: { value: string | null | undefined }) {
  const now = useClientNow();
  if (!value) return DASH;
  const fecha = new Date(value.length === 10 ? `${value}T23:59:59-06:00` : value);
  const vencida = now !== null && fecha.getTime() < now;
  return (
    <span
      className={`text-xs tabular-nums whitespace-nowrap ${
        vencida ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-600 dark:text-slate-400"
      }`}
    >
      {formatShortDate(fecha, { timeZone: MEXICO_TIME_ZONE })}
    </span>
  );
}

export function CantidadCell({ value }: { value: number | undefined }) {
  if (value === undefined) return DASH;
  return (
    <span className="text-sm tabular-nums font-semibold text-slate-800 dark:text-white">
      {formatQuantityValue(value)} <span className="text-xs font-normal text-slate-400">pzs</span>
    </span>
  );
}
