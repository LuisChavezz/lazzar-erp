"use client";

import Link from "next/link";
import {
  ListIcon,
  ReportesIcon,
  ClientesIcon,
  CheckCircleIcon,
} from "@/src/components/Icons";

// ─── Definición de acciones ───────────────────────────────────────────────────
const ACTIONS = [
  // {
  //   key: "kanban",
  //   href: "/operations/quotes",
  //   label: "Vista Kanban",
  //   icon: KanbanBoardIcon,
  //   hoverClasses:
  //     "hover:bg-sky-50 dark:hover:bg-sky-900/10 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-200 dark:hover:border-sky-500/20",
  //   iconHoverClass: "group-hover:text-sky-500",
  // },
  {
    key: "cotizaciones",
    href: "/operations/quotes",
    label: "Cotizaciones",
    icon: ListIcon,
    hoverClasses:
      "hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-500/20",
    iconHoverClass: "group-hover:text-violet-500",
  },
  {
    key: "por-autorizar",
    href: "/operations/quotes",
    label: "Por Autorizar",
    icon: CheckCircleIcon,
    hoverClasses:
      "hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-500/20",
    iconHoverClass: "group-hover:text-amber-500",
  },
  {
    key: "clientes",
    href: "/sales/customers",
    label: "Clientes",
    icon: ClientesIcon,
    hoverClasses:
      "hover:bg-sky-50 dark:hover:bg-sky-900/10 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-200 dark:hover:border-sky-500/20",
    iconHoverClass: "group-hover:text-sky-500",
  },
  {
    key: "reportes",
    href: "/system/reports",
    label: "Reportes",
    icon: ReportesIcon,
    hoverClasses:
      "hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/20",
    iconHoverClass: "group-hover:text-rose-500",
  },
] as const;

// ─── Componente ───────────────────────────────────────────────────────────────
export const OperationsQuickActions = () => {
  return (
    <section
      aria-label="Accesos rápidos de operaciones"
      className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-5"
    >
      <h2 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4">
        Accesos Rápidos
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.key}
              href={action.href}
              aria-label={action.label}
              className={[
                "flex flex-col items-center justify-center p-3 rounded-xl",
                "bg-slate-50 dark:bg-slate-800/50",
                "border border-slate-100 dark:border-white/5",
                "text-slate-600 dark:text-slate-400",
                "transition-all group",
                action.hoverClasses,
              ].join(" ")}
            >
              <Icon
                className={`w-5 h-5 mb-2 text-slate-400 transition-colors ${action.iconHoverClass}`}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium text-center leading-tight">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

