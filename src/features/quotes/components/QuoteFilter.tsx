import type { DataTableFilterConfig } from "@/src/components/DataTable";
import {
  TIPO_PEDIDO,
  getTipoPedidoConfig,
} from "../../orders/constants/pedidoStatus";
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

/**
 * Opciones de tipo de pedido: los TRES valores del catálogo, fijos.
 *
 * A diferencia de `buildStatusOptions`, no se derivan de las cotizaciones
 * cargadas: si no hay ninguna muestra en la lista, la opción "Muestra" debe
 * seguir apareciendo —si no, el filtro solo ofrece lo que el usuario ya está
 * viendo y no sirve para descubrir que no hay ninguna—.
 *
 * `value` va como STRING a propósito: `DataTable` compara
 * `String(row[configId]) === option.value`.
 */
const TIPO_PEDIDO_OPTIONS: { value: string; label: string }[] = Object.values(
  TIPO_PEDIDO
).map((tipo) => ({
  value: String(tipo),
  label: getTipoPedidoConfig(tipo).label,
}));

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
    {
      id: "tipo_pedido",
      label: "Tipo",
      options: TIPO_PEDIDO_OPTIONS,
    },
  ];
}
