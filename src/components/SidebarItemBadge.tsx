"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getPreOrderSummary } from "@/src/features/pre-orders/services/actions";
import { getNeedsSummary } from "@/src/features/purchase-needs/services/actions";

/** Rutas del menú lateral que muestran contadores. */
export const BADGE_PATHS = new Set(["/manufacturing/pre-orders", "/procurement/purchase-needs"]);

interface Count {
  value: number;
  tone: "red" | "sky";
  label: string;
}

/**
 * Contadores pendientes junto al elemento del menú. Se piden en el cliente
 * (el layout `(Main)` sigue estático, EC-767) y se refrescan al enfocar.
 * Solo se monta para las rutas de `BADGE_PATHS`, y el elemento solo aparece
 * si el usuario tiene permiso del módulo.
 */
function useBadgeCounts(path: string): Count[] {
  const isPreOrders = path === "/manufacturing/pre-orders";
  const pre = useGuardedQuery(
    {
      queryKey: ["pre-orders", "summary"],
      queryFn: getPreOrderSummary,
      enabled: isPreOrders,
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    },
    { toastId: "pre-orders-summary-refetch-error" },
  );
  const needs = useGuardedQuery(
    {
      queryKey: ["purchase-needs", "summary"],
      queryFn: getNeedsSummary,
      enabled: !isPreOrders,
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    },
    { toastId: "purchase-needs-summary-refetch-error" },
  );
  if (isPreOrders) {
    const d = pre.data;
    if (!d) return [];
    return [
      { value: d.urgentes, tone: "red" as const, label: "urgentes" },
      { value: d.por_validar, tone: "sky" as const, label: "por validar" },
    ].filter((c) => c.value > 0);
  }
  const n = needs.data?.pendientes ?? 0;
  return n > 0 ? [{ value: n, tone: "sky", label: "pendientes" }] : [];
}

const TONE = {
  red: "bg-rose-500 text-white",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
};

export default function SidebarItemBadge({
  path,
  variant,
  labelClass,
}: {
  path: string;
  variant: "desktop" | "mobile";
  /** Opacidad de la etiqueta (oculta con el menú colapsado). */
  labelClass: string;
}) {
  const counts = useBadgeCounts(path);
  if (counts.length === 0) return null;
  const title = counts.map((c) => `${c.value} ${c.label}`).join(" · ");
  const pills = counts.map((c) => (
    <span
      key={c.label}
      className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 tabular-nums ${TONE[c.tone]}`}
    >
      {c.value > 99 ? "99+" : c.value}
    </span>
  ));
  if (variant === "mobile") {
    return <span className="ml-auto flex gap-1" title={title}>{pills}</span>;
  }
  return (
    <>
      {/* Menú colapsado: un punto en el icono (rojo si hay urgentes). */}
      <span
        aria-hidden="true"
        className={`absolute left-7 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-950 ${
          counts[0].tone === "red" ? "bg-rose-500" : "bg-sky-500"
        } ${labelClass === "opacity-100" ? "hidden" : "group-hover/sidebar:opacity-0"}`}
      />
      <span className={`absolute right-3 flex gap-1 transition-opacity duration-200 ${labelClass}`} title={title}>
        {pills}
      </span>
      <span className="sr-only">{title}</span>
    </>
  );
}
