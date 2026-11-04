"use client";

import { CheckCircleIcon, ReceiptIcon } from "@/src/components/Icons";
import KpiGrid, { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";
import {
  KpiMutedValue,
  KpiTaggedBlocks,
  SEPARATE_CURRENCIES_NOTE,
} from "@/src/components/KpiCurrency";
import { formatKpiDate, formatKpiTaggedCurrencyAmount } from "@/src/utils/kpiFormat";
import type { CobrosResumenMoneda } from "../interfaces/collection.interface";
import { useCobrosResumen } from "../hooks/useCobrosResumen";

type Metric = "monto" | "cantidad";

const PLACEHOLDER = "—";

/**
 * Nota del período, leída de `periodo` en la respuesta (el backend lo resuelve:
 * por defecto, del día 1 del mes en curso a hoy). Sin respuesta aún, no afirma
 * ningún rango.
 */
const periodNote = (periodo: { fecha_inicio: string; fecha_fin: string } | undefined) =>
  periodo
    ? `Período del ${formatKpiDate(periodo.fecha_inicio)} al ${formatKpiDate(periodo.fecha_fin)}. Solo cuenta cobros aplicados.`
    : "Solo cuenta cobros aplicados.";

/** Un bloque por moneda; solo `<span>`: se pinta dentro del `<h3>` de `KpiGrid`. */
function CurrencyBlocks({ monedas, metric }: { monedas: CobrosResumenMoneda[]; metric: Metric }) {
  return (
    <span className="block space-y-1.5">
      {monedas.map((moneda) => (
        <KpiTaggedBlocks
          // Por código: `moneda_id` es null cuando varias monedas comparten código.
          key={moneda.moneda_codigo}
          blocks={[
            {
              key: moneda.moneda_codigo,
              value:
                metric === "monto"
                  ? formatKpiTaggedCurrencyAmount(moneda.monto_total, moneda.moneda_codigo)
                  : String(moneda.cantidad),
              tag: moneda.moneda_codigo,
            },
          ]}
        />
      ))}
    </span>
  );
}

/**
 * Indicadores de cobros del período, POR MONEDA, nunca una suma de monedas
 * mezcladas. Salen de `cobros/resumen/` (EC-746), que ya trae una entrada por
 * cada moneda de las cuentas bancarias de la empresa —en cero si no hubo
 * cobros—, así que basta con quien pueda leer Cobros (`R-CONTABILIDAD-CXC`).
 *
 * Es independiente del listado: su carga o su error no tocan la tabla ni su
 * toolbar.
 */
export function CollectionStats() {
  const { resumen, isLoading, isInitialError } = useCobrosResumen();
  const monedas = resumen?.por_moneda ?? [];
  const periodText = periodNote(resumen?.periodo);

  const valueFor = (metric: Metric) => {
    if (isInitialError) return <KpiMutedValue>No disponible</KpiMutedValue>;
    if (isLoading || !resumen) return PLACEHOLDER;
    if (monedas.length === 0) return <KpiMutedValue>Sin cuentas bancarias</KpiMutedValue>;
    return <CurrencyBlocks monedas={monedas} metric={metric} />;
  };

  const items: KpiCompactItem[] = [
    {
      label: "Cobrado en el período",
      value: valueFor("monto"),
      icon: CheckCircleIcon,
      ...(monedas.length > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
      info: `${periodText} ${SEPARATE_CURRENCIES_NOTE}`,
      hideProgress: true,
    },
    {
      label: "Cobros aplicados",
      value: valueFor("cantidad"),
      icon: ReceiptIcon,
      ...(monedas.length > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
      info: `${periodText} El conteo va por la moneda de la cuenta bancaria de cada cobro.`,
      hideProgress: true,
    },
  ];

  return <KpiGrid compact items={items} />;
}
