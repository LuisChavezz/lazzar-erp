import Link from "next/link";
import { PlusIcon } from "@/src/components/Icons";

export const QuickActions = () => {
  return (
    <section
      aria-label="Acciones rápidas"
      className="rounded-4xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 shadow-xl shadow-sky-500/10 p-6"
    >
      <h2 className="text-base font-semibold text-slate-800 dark:text-white">
        Acciones Rápidas
      </h2>
      <div className="mt-4 space-y-3">
        <Link
          href="/sales/orders/new"
          aria-label="Crear nuevo pedido"
          className="flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-white/60 dark:bg-black/40 px-4 py-3 text-sm font-semibold text-sky-600 dark:text-sky-200 transition-colors hover:bg-white/80 dark:hover:bg-black/60"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          Nuevo Pedido
        </Link>
      </div>
    </section>
  );
};
