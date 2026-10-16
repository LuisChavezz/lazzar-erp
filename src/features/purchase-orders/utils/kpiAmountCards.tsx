import { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";

/**
 * Tarjeta en espera de la señal de importes (`pending` de
 * `getPurchaseOrderKpiAmountVisibility`): título e icono, y un marcador de
 * carga en el lugar del valor, sin acción ni detalle. Así nunca se pinta
 * primero en un modo (sin importes) y luego cambia al otro (con importes). El
 * marcador va como `value` —`KpiCompactItem` admite un nodo en línea—, sin
 * tocar `KpiGrid`. La usan los indicadores de recepciones y el Scorecard de
 * proveedores.
 */
export function pendingAmountCard(base: Pick<KpiCompactItem, "label" | "icon">): KpiCompactItem {
  return {
    ...base,
    ...KPI_MUTED_ICON,
    value: (
      <span
        role="status"
        aria-label={`Cargando ${base.label}`}
        className="inline-block h-6 w-28 align-middle rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse"
      />
    ),
    hideProgress: true,
  };
}
