// Piezas presentacionales de AVANCE: una tarjeta métrica y una barra de
// progreso de celda. Nacieron dentro de `EmbroideryProgressSummary` (resumen de
// avance de una orden de bordado) y se promovieron aquí sin cambiar su render
// al aparecer el segundo consumidor: el seguimiento de picking del detalle de
// pedido, que necesita exactamente el mismo lenguaje visual (tarjetas de conteo
// arriba, barras rotuladas por unidad debajo).
//
// Sin `"use client"` a propósito, igual que `StatusBadge`/`KpiGrid`: no tienen
// estado ni manejadores, así que sirven tanto a componentes cliente como
// servidor. No confundir con `KpiGrid`, que es la tarjeta GRANDE de los
// dashboards de listado; estas son para incrustarse dentro de una `Section`.

import { CheckIcon } from "./Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { clampPercentage } from "@/src/utils/percentage";

/**
 * Tarjeta métrica. Con `total` se lee "hecho / total"; sin él, solo la cifra.
 * `hint` cuelga un dato secundario debajo, para no gastar una tarjeta entera en
 * una cifra que solo tiene sentido junto a la principal.
 */
export const MetricCard = ({
  label,
  done,
  total,
  hint,
}: {
  label: string;
  done: string;
  total?: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3">
    <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800 dark:text-white">
      {done}
      {total !== undefined && (
        <span className="text-sm font-normal text-slate-400 dark:text-slate-500">
          {" "}
          / {total}
        </span>
      )}
    </p>
    {hint !== undefined && (
      <p className="mt-0.5 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
        {hint}
      </p>
    )}
  </div>
);

/**
 * Barra de progreso pequeña + porcentaje, para una celda de la tabla.
 * `percentage` llega YA calculado por el backend: aquí solo se acota el ancho
 * visual, nunca se recalcula el número.
 */
export const RowProgressBar = ({
  percentage,
  complete = false,
}: {
  percentage: number;
  /**
   * Pinta la barra de "terminado" (verde + palomita). Solo debe pasarlo quien
   * pueda AFIRMARLO: no todo porcentaje de esta tabla es una fracción acotada a
   * 100 (ver `RowPuntadasProgress`), y un `>= 100` sobre una razón que puede
   * pasarse legítimamente daría por completo lo que no lo está.
   */
  complete?: boolean;
}) => {
  const width = clampPercentage(percentage);
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <span
          className={`block h-full rounded-full ${complete ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${width}%` }}
        />
      </span>
      <span
        className={`tabular-nums font-semibold ${
          complete
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {formatQuantityValue(percentage)}%
      </span>
      {complete && (
        <CheckIcon
          className="w-3.5 h-3.5 text-emerald-500 shrink-0"
          aria-label="Completado"
        />
      )}
    </span>
  );
};
