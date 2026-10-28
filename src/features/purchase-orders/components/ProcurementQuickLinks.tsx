"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { ChevronRightIcon } from "@/src/components/Icons";
import { hasPermission } from "@/src/utils/permissions";

/**
 * Accesos directos del inicio de Compras: las mismas hojas que el sidebar del
 * módulo (`appRoutes`, sin las de detalle), filtradas por el permiso de cada
 * una para no ofrecer un enlace que el proxy rebotaría. En móvil es una fila
 * deslizable; desde `sm`, una rejilla.
 */
export function ProcurementQuickLinks() {
  const { data: session } = useSession();
  const group = appRouteGroups.find((g) => g.key === "procurement");
  const items = (group?.items ?? []).filter(
    (item) =>
      !item.parentPath &&
      item.showInSidebar !== false &&
      (!item.permission || hasPermission(item.permission, session?.user)),
  );

  if (items.length === 0) return null;

  return (
    <nav aria-label="Accesos rápidos de Compras">
      <ul className="flex gap-2 overflow-x-auto snap-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.key} className="snap-start shrink-0 sm:shrink">
              <Link
                href={item.path}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black px-3 py-2.5 shadow-sm hover:border-sky-300 dark:hover:border-sky-500/40 hover:shadow-md transition-all"
              >
                <span className="grid place-items-center w-8 h-8 shrink-0 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="flex-1 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                  {item.label}
                </span>
                <ChevronRightIcon
                  className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
