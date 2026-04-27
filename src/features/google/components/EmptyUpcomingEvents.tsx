/** Estado vacío del panel de próximos eventos de Google Calendar. */
export const EmptyUpcomingEvents = () => (
  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-white/5 px-4 py-5 text-center">
    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
      Sin eventos próximos
    </p>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
      No tienes eventos agendados en los próximos días.
    </p>
  </div>
);
