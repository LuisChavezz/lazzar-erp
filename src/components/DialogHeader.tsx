import type { ComponentType, SVGProps } from "react";

interface DialogHeaderProps {
  title: string;
  subtitle: string;
  statusColor?: "sky" | "emerald" | "amber" | "rose" | "indigo" | "violet" | "orange";
  /**
   * Ícono del formulario o detalle, en una insignia a la izquierda del título,
   * del color de `statusColor`. Sin él, el encabezado queda exactamente como
   * antes.
   */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export const DialogHeader = ({
  title,
  subtitle,
  statusColor = "sky",
  icon: Icon,
}: DialogHeaderProps) => {
  // `badge`: insignia del ícono, del mismo color que el punto de estado.
  const colorMap = {
    sky: { bg: "bg-sky-500", ping: "bg-sky-400", badge: "bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400" },
    emerald: { bg: "bg-emerald-500", ping: "bg-emerald-400", badge: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    amber: { bg: "bg-amber-500", ping: "bg-amber-400", badge: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    rose: { bg: "bg-rose-500", ping: "bg-rose-400", badge: "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400" },
    indigo: { bg: "bg-indigo-500", ping: "bg-indigo-400", badge: "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
    violet: { bg: "bg-violet-500", ping: "bg-violet-400", badge: "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400" },
    orange: { bg: "bg-orange-500", ping: "bg-orange-400", badge: "bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  } as const;

  const colors = colorMap[statusColor] || colorMap.sky;

  return (
    <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
      {Icon && (
        <span className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 ${colors.badge}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
      )}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
          {title}
        </h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.ping}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.bg}`}></span>
          </span>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
