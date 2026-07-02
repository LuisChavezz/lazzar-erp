export interface StatusBadgeConfigEntry {
  cls: string;
  dot: string;
  label?: string;
}

interface StatusBadgeProps {
  status: string;
  config: Record<string, StatusBadgeConfigEntry>;
  /** Estilo aplicado cuando `status` no tiene entrada en `config`. */
  defaultConfig?: StatusBadgeConfigEntry;
}

const FALLBACK_CFG: StatusBadgeConfigEntry = {
  cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  dot: "bg-slate-400",
};

/**
 * Badge de estatus genérico: punto de color + etiqueta, estilizado a partir
 * de un `config` propio de cada dominio (factura, CxC, etc.) — los valores de
 * estatus no se comparten entre dominios, solo la presentación.
 */
export function StatusBadge({ status, config, defaultConfig }: StatusBadgeProps) {
  const cfg = config[status] ?? defaultConfig ?? FALLBACK_CFG;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}
        aria-hidden="true"
      />
      {cfg.label ?? (status || "—")}
    </span>
  );
}
