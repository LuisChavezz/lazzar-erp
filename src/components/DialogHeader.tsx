
interface DialogHeaderProps {
  title: string;
  subtitle: string;
  statusColor?: "sky" | "emerald" | "amber" | "rose" | "indigo" | "violet";
}

export const DialogHeader = ({ 
  title, 
  subtitle, 
  statusColor = "sky" 
}: DialogHeaderProps) => {
  const colorMap = {
    sky: { bg: "bg-sky-500", ping: "bg-sky-400" },
    emerald: { bg: "bg-emerald-500", ping: "bg-emerald-400" },
    amber: { bg: "bg-amber-500", ping: "bg-amber-400" },
    rose: { bg: "bg-rose-500", ping: "bg-rose-400" },
    indigo: { bg: "bg-indigo-500", ping: "bg-indigo-400" },
    violet: { bg: "bg-violet-500", ping: "bg-violet-400" },
  } as const;

  const colors = colorMap[statusColor] || colorMap.sky;

  return (
    <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
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
