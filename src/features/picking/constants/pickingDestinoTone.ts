/**
 * Color por destino de programación, compartido por la columna "Para" y el
 * desglose de KPIs, para que un destino se reconozca igual en los dos.
 */
export interface DestinoTone {
  badge: string;
  bar: string;
}

const DESTINO_TONES: Record<string, DestinoTone> = {
  BORDADO: {
    badge: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
    bar: "bg-violet-500",
  },
  EMBARQUE: {
    badge: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
    bar: "bg-sky-500",
  },
  APARTADO: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    bar: "bg-emerald-500",
  },
  CORTE_MANGA: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    bar: "bg-amber-500",
  },
  REFLEJANTE: {
    badge: "bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-500/10 dark:text-lime-300 dark:ring-lime-500/30",
    bar: "bg-lime-500",
  },
};

const SIN_DESTINO: DestinoTone = {
  badge: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10",
  bar: "bg-slate-300 dark:bg-slate-600",
};

export const destinoTone = (destino: string | null | undefined): DestinoTone =>
  (destino && DESTINO_TONES[destino]) || SIN_DESTINO;
