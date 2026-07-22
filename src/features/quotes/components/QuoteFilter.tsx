import type { DataTableFilterConfig } from "@/src/components/DataTable";
import type { Quote } from "../interfaces/quote.interface";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Construye las opciones de estatus a partir de las cotizaciones. */
function buildStatusOptions(
  quotes: Quote[],
): { value: string; label: string }[] {
  const map = new Map<number, string>();
  for (const quote of quotes) {
    const id = quote.estatus;
    const label = quote.estatus_label;
    if (id != null && label && !map.has(id)) {
      map.set(id, label);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([id, label]) => ({
      value: String(id),
      label,
    }));
}

// ─── Factory de configuración de filtros ─────────────────────────────────────

/**
 * Crea la configuración de filtros para la tabla de cotizaciones.
 * Debe llamarse dentro de un `useMemo` con las cotizaciones como dependencia.
 */
export function createQuoteFilterConfig(quotes: Quote[]): DataTableFilterConfig[] {
  return [
    {
      id: "estatus",
      label: "Estatus",
      options: buildStatusOptions(quotes),
    },
  ];
}
