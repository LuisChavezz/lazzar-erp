interface OrderMenuCardProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export function OrderMenuCard({
  title,
  description,
  icon: Icon,
  onClick,
  onMouseEnter,
}: OrderMenuCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="group relative cursor-pointer bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-left hover:border-sky-500 dark:hover:border-sky-500 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 flex flex-col gap-6 overflow-hidden w-full"
      aria-label={title}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-sky-500/10 transition-colors"></div>
      <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-sky-500 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {description || "Gestionar información de órdenes"}
        </p>
      </div>
    </button>
  );
}
