"use client";

import { CheckCircleIcon } from "@/src/components/Icons";

/**
 * Textos de la vista de éxito. La edición dice "actualizada", igual que su
 * toast (`useUpdateQuote`: "Cotización actualizada correctamente"); antes
 * reutilizaba los del alta y decía "creada" tras guardar cambios (EC-753).
 */
const SUCCESS_COPY = {
  create: {
    title: "Cotización creada con éxito",
    subtitle: "Finalizando proceso de creación...",
  },
  edit: {
    title: "Cotización actualizada con éxito",
    subtitle: "Finalizando proceso de actualización...",
  },
} as const;

export type QuoteSuccessVariant = keyof typeof SUCCESS_COPY;

export function QuoteCreationSuccessMessage({
  variant = "create",
}: {
  variant?: QuoteSuccessVariant;
}) {
  const copy = SUCCESS_COPY[variant];
  return (
    <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckCircleIcon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-display font-semibold text-slate-900 dark:text-white">
          {copy.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {copy.subtitle}
        </p>
      </div>
    </section>
  );
}
