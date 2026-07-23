import type { PickingKpis } from "../utils/picking.utils";

/**
 * Colores por prioridad de picking. `PickingColumns` pinta `prioridad` como
 * texto plano (sin badge/color) — no existe una convención de color previa
 * que reusar para este desglose, así que se define aquí con el mismo criterio
 * semántico ya usado en el resto del proyecto (rose = urgente, amber =
 * moderado, sky = bajo), análogo a como `AccountsReceivableAgingSummary`
 * colorea sus rangos de antigüedad.
 */
const PRIORIDAD_STYLES: Record<
  keyof PickingKpis["prioridadBreakdown"],
  { label: string; bar: string; chip: string; dot: string }
> = {
  ALTA: {
    label: "Alta",
    bar: "bg-rose-500",
    chip: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  MEDIA: {
    label: "Media",
    bar: "bg-amber-400",
    chip: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  BAJA: {
    label: "Baja",
    bar: "bg-sky-400",
    chip: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-400",
  },
};

const PRIORIDAD_ORDER: Array<keyof PickingKpis["prioridadBreakdown"]> = [
  "ALTA",
  "MEDIA",
  "BAJA",
];

export const PickingPriorityBreakdown = ({
  breakdown,
}: {
  breakdown: PickingKpis["prioridadBreakdown"];
}) => {
  const total = PRIORIDAD_ORDER.reduce((acc, key) => acc + breakdown[key], 0);

  return (
    <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
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
          PRIORIDAD_ORDER.map((key) => {
            const width = (breakdown[key] / total) * 100;
            if (width <= 0) return null;
            return (
              <div
                key={key}
                className={`h-full ${PRIORIDAD_STYLES[key].bar}`}
                style={{ width: `${width}%` }}
                title={`${PRIORIDAD_STYLES[key].label}: ${breakdown[key]}`}
              />
            );
          })
        ) : (
          <div className="h-full w-full bg-slate-200 dark:bg-slate-700" />
        )}
      </div>

      {/* Detalle por prioridad */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {PRIORIDAD_ORDER.map((key) => {
          const style = PRIORIDAD_STYLES[key];
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
