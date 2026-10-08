import { Section } from "@/src/components/DetailDialogPrimitives";
import { MetricCard } from "@/src/components/ProgressPrimitives";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { parsePercentageValue } from "@/src/utils/percentage";
import type { PedidoTrackerPicking } from "../interfaces/order.interface";
import { formatPedidoPct } from "../utils/pedidoFormat";

// El tracker llega en la MISMA respuesta del detalle (no hay petición extra) y
// NO es dato contable: son conteos de prendas, que el filtro por rol del
// backend no toca. Se pinta igual para Ventas, Almacén y Contabilidad.
//
// Todos los KPIs viajan como STRING y con formato inconsistente (un cero llega
// como `"0"`, un valor como `"90.0000"`), así que SIEMPRE se leen con
// `parsePercentageValue` (porcentajes) o `formatExactQuantityValue` (conteos),
// nunca partiendo el string ni asumiendo decimales. Los conteos van a precisión
// completa (`Decimal(4)`): redondear a 2 pintaría "0" para una cantidad chica
// pero real. Los porcentajes van a 1 decimal (`formatPedidoPct`): es la
// resolución de la trazabilidad, cuyo paso "Asignado" mide lo mismo que "Avance
// asignado" y debe leerse con la misma cifra. Las dos barras comparten formato.

/** Tono de una barra: azul para lo ASIGNADO, verde para lo SURTIDO. */
const TRACKER_TONES = {
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
} as const;

/**
 * Barra de avance rotulada, a todo el ancho. Recibe el string CRUDO del API:
 * `parsePercentageValue` absorbe los dos formatos y acota a 0–100, de modo que
 * el ancho en CSS nunca se desborda.
 */
function TrackerBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof TRACKER_TONES;
}) {
  const pct = parsePercentageValue(value);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
          {formatPedidoPct(pct)}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${TRACKER_TONES[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Avance de surtido del PEDIDO COMPLETO: tres conteos y las dos barras.
 * Sin tracker (un backend anterior al campo responde sin él) no se pinta: no se
 * inventa un "0%" que afirmaría que nada se ha surtido cuando no se sabe.
 */
export function OrderPickingProgressSection({ tracker }: { tracker?: PedidoTrackerPicking }) {
  if (!tracker) return null;

  const totalPrendas = formatExactQuantityValue(tracker.total_prendas_pedido);

  return (
    <Section title="Avance de surtido">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Prendas del pedido" done={totalPrendas} />
        <MetricCard
          label="Prendas asignadas"
          done={formatExactQuantityValue(tracker.total_asignado)}
          total={totalPrendas}
        />
        <MetricCard
          label="Prendas surtidas"
          done={formatExactQuantityValue(tracker.total_surtido)}
          total={totalPrendas}
        />
      </div>
      <div className="mt-4 space-y-3">
        <TrackerBar label="Avance asignado" value={tracker.pct_asignado_pedido} tone="sky" />
        <TrackerBar label="Avance surtido" value={tracker.pct_surtido_pedido} tone="emerald" />
      </div>
    </Section>
  );
}
