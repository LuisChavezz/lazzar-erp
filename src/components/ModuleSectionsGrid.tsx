"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronRightIcon } from "./Icons";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { getRouteSections, getVisibleRouteSections } from "@/src/utils/routeSections";

// Mismo marco que las tarjetas de Home (`homeCards`), sin el efecto tilt: la
// tarjeta contiene varios enlaces y no puede ser ella misma un enlace.
const cardClassName =
  "rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full min-h-64 shadow-sm dark:shadow-none";

interface ModuleSectionsGridProps {
  moduleKey: string;
}

/**
 * Landing de un módulo con `sections`: una tarjeta por sub-grupo visible con
 * sus hojas visibles como enlaces. La visibilidad sale del mismo helper que el
 * sidebar y `ModuleNav` (`getVisibleRouteSections`), así que un sub-grupo podado
 * allí tampoco aparece aquí. Sin datos de backend.
 *
 * Es de cliente porque necesita la sesión (permisos) y pinta iconos como
 * componentes.
 */
export function ModuleSectionsGrid({ moduleKey }: ModuleSectionsGridProps) {
  const { data: session, status } = useSession();
  const group = appRouteGroups.find((item) => item.key === moduleKey);

  if (!group) {
    return null;
  }

  // Reserva el espacio de las tarjetas mientras resuelven los permisos (CLS),
  // igual que `HomeGrid`.
  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(getRouteSections(group) ?? []).map((section) => (
          <div key={section.key} className={cardClassName} aria-hidden="true" />
        ))}
      </div>
    );
  }

  const sections = getVisibleRouteSections(group, session?.user) ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {sections.map((section) => (
        <section
          key={section.key}
          aria-labelledby={`module-section-${section.key}`}
          className={cardClassName}
        >
          <h3
            id={`module-section-${section.key}`}
            className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-4 font-display"
          >
            {section.label}
          </h3>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRightIcon
                    className="h-4 w-4 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
