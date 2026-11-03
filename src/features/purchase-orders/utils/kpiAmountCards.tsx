import { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";
import { KpiMutedValue } from "@/src/components/KpiCurrency";
import { HIDDEN_KPI_AMOUNT_TEXT } from "./purchaseOrderKpis";

/**
 * Tarjeta de un indicador que es SOLO un importe, para quien no puede verlo
 * (`puede_ver_importes`): se queda con su título y dice "No visible", sin
 * drill-down; `info` explica por qué. La usan el gasto por categoría de OC y la
 * diferencia de precio de recepciones.
 */
export function hiddenAmountCard(base: Pick<KpiCompactItem, "label" | "icon">, info: string): KpiCompactItem {
  return {
    ...base,
    ...KPI_MUTED_ICON,
    value: <KpiMutedValue>{HIDDEN_KPI_AMOUNT_TEXT}</KpiMutedValue>,
    info,
    hideProgress: true,
  };
}
