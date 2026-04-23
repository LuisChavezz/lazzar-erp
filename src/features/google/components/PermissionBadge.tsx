interface PermissionBadgeProps {
  icon: React.ReactNode;
  label: string;
  granted: boolean;
}

export function PermissionBadge({ icon, label, granted }: PermissionBadgeProps) {
  return (
    <div
      title={granted ? `${label}: acceso concedido` : `${label}: acceso no concedido`}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
        granted
          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
      }`}
    >
      <span className={granted ? "opacity-100" : "opacity-30"}>{icon}</span>
      {label}
      {granted && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      )}
    </div>
  );
}
