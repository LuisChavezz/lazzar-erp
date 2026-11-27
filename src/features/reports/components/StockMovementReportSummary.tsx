"use client";

import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { TraspasosIcon, ClipboardListIcon, InventariosIcon } from "@/src/components/Icons";
import { categoriaInventarioLabel } from "../constants/movementReportViews";
import { formatMoneyValue, formatQuantityValue } from "@/src/utils/formatCurrency";
import type {
  StockMovementReportSummary as StockMovementReportSummaryData,
  StockMovementReportTypeFilter,
} from "@/src/features/stock/interfaces/stock-movement-report.interface";

interface StockMovementReportSummaryProps {
  // `undefined` explícito: el bloque degrada (no rompe) si falta `resumen`.
  summary: StockMovementReportSummaryData | undefined;
  /** Tipo filtrado: su tarjeta se marca. */
  tipoActivo: StockMovementReportTypeFilter;
  /** Clic en una tarjeta = filtrar por ese tipo (otra vez = volver a Todos). */
  onTipoChange: (tipo: StockMovementReportTypeFilter) => void;
}

const num = (v: string | number | undefined) => Number(v ?? 0) || 0;

const signo = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "");

/**
 * Totales del periodo completo (`resumen`, NO paginado): una tarjeta por tipo
 * con piezas, costo y registros, más el neto. Cada tarjeta filtra la tabla por
 * su tipo. Sin `por_tipo` (backend anterior) cae a los tres totales de siempre.
 */
export function StockMovementReportSummary({
  summary,
  tipoActivo,
  onTipoChange,
}: StockMovementReportSummaryProps) {
  if (!summary) return null;
  const pt = summary.por_tipo;

  if (!pt) {
    const items: KpiItem[] = [
      { label: "Total Movimientos", value: formatQuantityValue(summary.total_movimientos), icon: TraspasosIcon, iconBgClass: "bg-sky-50 dark:bg-sky-500/10", iconClass: "text-sky-500", status: "neutral" },
      { label: "Total Registros", value: formatQuantityValue(summary.total_registros), icon: ClipboardListIcon, iconBgClass: "bg-violet-50 dark:bg-violet-500/10", iconClass: "text-violet-500", status: "neutral" },
      { label: "Cantidad Total", value: formatQuantityValue(summary.total_cantidad), icon: InventariosIcon, iconBgClass: "bg-amber-50 dark:bg-amber-500/10", iconClass: "text-amber-500", status: "neutral" },
    ];
    return <KpiGrid items={items} />;
  }

  const ajustePos = num(pt.ajustes_positivos.piezas);
  const ajusteNeg = num(pt.ajustes_negativos.piezas);
  const cards: {
    tipo: StockMovementReportTypeFilter;
    label: string;
    dot: string;
    piezas: string;
    detalle: string;
    registros: number;
  }[] = [
    {
      tipo: "ENTRADA",
      label: "Entradas",
      dot: "bg-emerald-500",
      piezas: `+${formatQuantityValue(pt.entradas.piezas)}`,
      detalle: formatMoneyValue(pt.entradas.costo, "MXN"),
      registros: pt.entradas.registros,
    },
    {
      tipo: "SALIDA",
      label: "Salidas",
      dot: "bg-red-500",
      piezas: `−${formatQuantityValue(pt.salidas.piezas)}`,
      detalle: formatMoneyValue(pt.salidas.costo, "MXN"),
      registros: pt.salidas.registros,
    },
    {
      tipo: "AJUSTE",
      label: "Ajustes",
      dot: "bg-amber-500",
      piezas: `+${formatQuantityValue(ajustePos)} / −${formatQuantityValue(ajusteNeg)}`,
      detalle: `${formatMoneyValue(pt.ajustes_positivos.costo, "MXN")} / ${formatMoneyValue(pt.ajustes_negativos.costo, "MXN")}`,
      registros: pt.ajustes_positivos.registros + pt.ajustes_negativos.registros,
    },
    {
      tipo: "TRANSFERENCIA",
      label: "Transferencias",
      dot: "bg-blue-500",
      // Con un almacén filtrado: las que salen de él y las que entran. Sin
      // filtro, solo las piezas movidas (no cambian el total).
      piezas: pt.transferencias.salientes && pt.transferencias.entrantes
        ? `−${formatQuantityValue(pt.transferencias.salientes.piezas)} / +${formatQuantityValue(pt.transferencias.entrantes.piezas)}`
        : formatQuantityValue(pt.transferencias.piezas),
      detalle: pt.transferencias.salientes && pt.transferencias.entrantes
        ? "salen / entran"
        : "no cambian el total",
      registros: pt.transferencias.registros,
    },
  ];

  const netoPiezas = num(summary.neto_piezas);
  const netoCosto = num(summary.neto_costo);

  const categorias = Object.entries(summary.por_categoria ?? {}).filter(
    (e): e is [string, NonNullable<(typeof e)[1]>] => e[1] !== undefined,
  );

  const netoTone =
    netoPiezas < 0
      ? "text-red-700 dark:text-red-400"
      : netoPiezas > 0
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-slate-900 dark:text-slate-100";

  // Hoja de totales: una sola pieza dividida por líneas, como el renglón de
  // totales de un libro. Cada celda filtra la tabla por su tipo; el neto cierra
  // la hoja a la derecha, separado por una doble línea.
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-transparent lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.3fr)]">
      {cards.map((c, i) => {
        const activo = tipoActivo === c.tipo;
        return (
          <button
            key={c.tipo}
            type="button"
            aria-pressed={activo}
            title={activo ? "Ver todos los tipos" : `Ver solo ${c.label.toLowerCase()}`}
            onClick={() => onTipoChange(activo ? "TODOS" : c.tipo)}
            className={`relative cursor-pointer px-5 py-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/60 ${
              i % 2 === 1 ? "border-l" : ""
            } ${i >= 2 ? "border-t lg:border-t-0" : ""} ${i > 0 ? "lg:border-l" : ""} border-slate-200 dark:border-white/10 ${
              activo
                ? "bg-slate-50 shadow-[inset_0_3px_0_0_var(--color-accent)] dark:bg-white/[0.04] dark:shadow-[inset_0_3px_0_0_var(--color-brand-500)]"
                : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"
            }`}
          >
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className={`h-2 w-2 rounded-full ${c.dot}`} aria-hidden="true" />
              {c.label}
            </span>
            <span className="mt-1.5 block text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {c.piezas}{" "}
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">pzas</span>
            </span>
            <span className="mt-1 flex items-baseline justify-between gap-2 text-xs tabular-nums text-slate-500 dark:text-slate-400">
              <span className="truncate">{c.detalle}</span>
              <span className="shrink-0">{formatQuantityValue(c.registros)} reg.</span>
            </span>
          </button>
        );
      })}

      <div className="col-span-2 border-t-4 border-double border-slate-300 bg-slate-50 px-5 py-4 dark:border-white/15 dark:bg-white/[0.04] lg:col-span-1 lg:border-t-0 lg:border-l-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Neto del periodo
        </span>
        <span className={`mt-1 block text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${netoTone}`}>
          {signo(netoPiezas)}
          {formatQuantityValue(Math.abs(netoPiezas))}{" "}
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">pzas</span>
        </span>
        <span className="mt-1 block text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {signo(netoCosto)}
          {formatMoneyValue(Math.abs(netoCosto), "MXN")} en valor
        </span>
      </div>

      {/* Pie de la hoja: el neto por categoría contable (cada una va a una
          cuenta distinta). Solo si el backend lo manda. */}
      {categorias.length > 0 && (
        <div className="col-span-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-slate-200 px-5 py-2.5 text-xs dark:border-white/10 lg:col-span-5">
          <span className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Por categoría
          </span>
          {categorias.map(([clave, b]) => {
            const piezas = num(b.piezas);
            const costo = num(b.costo);
            return (
              <span key={clave} className="tabular-nums text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {categoriaInventarioLabel(clave)}
                </span>{" "}
                {signo(piezas)}
                {formatQuantityValue(Math.abs(piezas))} pzas · {signo(costo)}
                {formatMoneyValue(Math.abs(costo), "MXN")}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
