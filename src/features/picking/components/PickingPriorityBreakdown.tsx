import {
  PICKING_PRIORIDAD_CONFIG,
  PICKING_PRIORIDAD_ORDER,
} from "../constants/pickingPrioridad";
import type { PickingKpis } from "../utils/picking.utils";

/**
 * Desglose del listado por prioridad. Los colores salen de
 * `PICKING_PRIORIDAD_CONFIG` —la misma fuente que el badge de la columna
 * "Prioridad"—, así que la tabla y estas tarjetas no pueden divergir.
 *
 * `className` es lo que le permite a `PickingStats` colocarla como un
 * tercer miembro (`md:col-span-2`) de la MISMA fila de KPIs en vez de
 * apilarla debajo — `h-full flex flex-col` interno reparte el contenido
 * cuando la fila queda más alta que su contenido natural (el `items-stretch`
 * de esa grilla la estira a la altura de las tarjetas vecinas).
 */
export const PickingPriorityBreakdown = ({
  breakdown,
  className = "",
}: {
  breakdown: PickingKpis["prioridadBreakdown"];
  className?: string;
}) => {
  const total = PICKING_PRIORIDAD_ORDER.reduce((acc, key) => acc + breakdown[key], 0);

  return (
    <div
      className={`h-full flex flex-col justify-center rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Pickings por Prioridad
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Distribución del listado cargado
          </p>
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
          {total}
        </span>
      </div>

      {/* Barra segmentada */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {total > 0 ? (
          PICKING_PRIORIDAD_ORDER.map((key) => {
            const width = (breakdown[key] / total) * 100;
            if (width <= 0) return null;
            return (
              <div
                key={key}
                className={`h-full ${PICKING_PRIORIDAD_CONFIG[key].bar}`}
                style={{ width: `${width}%` }}
                title={`${PICKING_PRIORIDAD_CONFIG[key].label}: ${breakdown[key]}`}
              />
            );
          })
        ) : (
          <div className="h-full w-full bg-slate-200 dark:bg-slate-700" />
        )}
      </div>

      {/* Detalle por prioridad */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {PICKING_PRIORIDAD_ORDER.map((key) => {
          const style = PICKING_PRIORIDAD_CONFIG[key];
          const count = breakdown[key];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={key}
              className="rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] p-3"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {style.label}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums mt-1.5">
                {count}
              </p>
              <p className={`text-[11px] font-medium mt-0.5 ${style.chip}`}>{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
