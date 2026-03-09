type PipelineStage = {
  label: string;
  count: number;
  colorClass: string;
};

const STAGES: PipelineStage[] = [
  { label: "Prospecto", count: 45, colorClass: "bg-sky-500" },
  { label: "Calificado", count: 28, colorClass: "bg-purple-500" },
  { label: "Propuesta", count: 12, colorClass: "bg-amber-500" },
  { label: "Negociación", count: 5, colorClass: "bg-rose-500" },
];

export const SalesPipelines = () => {
  const maxValue = Math.max(...STAGES.map((stage) => stage.count));

  return (
    <section
      aria-label="Pipeline de ventas"
      className="rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">
          Pipeline de Ventas
        </h2>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {STAGES.reduce((acc, stage) => acc + stage.count, 0)} leads
        </span>
      </div>
      <div className="space-y-4">
        {STAGES.map((stage) => {
          const width = Math.round((stage.count / maxValue) * 100);

          return (
            <div key={stage.label} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>{stage.label}</span>
                <span>{stage.count} leads</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
                <div
                  role="progressbar"
                  aria-label={`${stage.label} ${stage.count} leads`}
                  aria-valuenow={stage.count}
                  aria-valuemin={0}
                  aria-valuemax={maxValue}
                  className={`h-full rounded-full ${stage.colorClass}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
