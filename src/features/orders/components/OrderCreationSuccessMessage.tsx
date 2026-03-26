"use client";

import { CheckCircleIcon } from "@/src/components/Icons";

export function OrderCreationSuccessMessage() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckCircleIcon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-display font-semibold text-slate-900 dark:text-white">
          Cotización creada con éxito
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Finalizando proceso de creación...
        </p>
      </div>
    </section>
  );
}
