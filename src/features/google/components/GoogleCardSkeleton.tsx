export function GoogleCardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-36" />
        </div>
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
    </div>
  );
}
