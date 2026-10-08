import type { StatusBadgeConfigEntry } from "./StatusBadge";

/**
 * Estatus compacto para la variante `compact` de `KpiCard`: punto de color +
 * texto chico, sin la píldora de `StatusBadge` (que no cabe junto al valor y la
 * acción en una tarjeta compacta de cuatro columnas). Lee el MISMO
 * `StatusBadgeConfigEntry` que `StatusBadge` (`dot` para el color y `label`),
 * así que cada dominio reutiliza su config tal cual; sin `label` muestra el
 * valor crudo, igual que `StatusBadge`.
 */
export function KpiStatusDot({ status, entry }: { status: string; entry: StatusBadgeConfigEntry }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-slate-600 dark:text-slate-300">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.dot}`} aria-hidden="true" />
      {entry.label ?? (status || "—")}
    </span>
  );
}
