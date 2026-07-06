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

/**
 * Config compartida para el flag booleano `activo` de los catálogos de
 * clientes (Customer, AccountingCustomer, OperationsCustomer): es el mismo
 * concepto en los tres, no un estatus propio de un dominio distinto, así
 * que aquí sí se comparte para que no diverja entre módulos.
 */
export const ACTIVO_INACTIVO_CFG: Record<"activo" | "inactivo", StatusBadgeConfigEntry> = {
  activo: {
    label: "Activo",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  inactivo: {
    label: "Inactivo",
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};
