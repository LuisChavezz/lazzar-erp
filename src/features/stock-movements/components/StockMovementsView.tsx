"use client";

import { memo, useMemo } from "react";
import {
  ClockIcon,
  ErrorIcon,
  InventariosIcon,
  CheckCircleIcon,
} from "@/src/components/Icons";
import { DataTable } from "@/src/components/DataTable";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { useStockMovements } from "../hooks/useStockMovements";
import { getStockMovementsColumns } from "./StockMovementsColumns";
import { StockMovementForm } from "./StockMovementForm";
import { stockMovementsFilterConfig } from "./StockMovementsFilter";
import type { StockMovement } from "../interfaces/stock-movements.interface";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** Suma el valor absoluto de los deltas de un movimiento. */
function sumMutations(item: StockMovement): number {
  const items = item.despues_json?.items ?? item.antes_json?.items ?? [];
  return items.reduce((acc, i) => acc + Math.abs(parseFloat(i.delta)), 0);
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

const MovementsStats = memo(function MovementsStats({ items }: { items: StockMovement[] }) {
  const hoy = useMemo(
    () => items.filter((i) => isToday(i.fecha_movimiento)),
    [items],
  );

  const discrepancies = useMemo(
    () => items.filter((i) => i.tipo_movimiento === "AJUSTE"),
    [items],
  );

  const volumenTotal = useMemo(
    () => items.reduce((acc, i) => acc + sumMutations(i), 0),
    [items],
  );

  const precision = useMemo(() => {
    if (items.length === 0) return 100;
    const okCount = items.length - discrepancies.length;
    return Math.round((okCount / items.length) * 100);
  }, [items, discrepancies]);

  const formattedVolumen = useMemo(
    () =>
      volumenTotal >= 1_000
        ? `${(volumenTotal / 1_000).toFixed(1)}k`
        : volumenTotal.toLocaleString("es-MX"),
    [volumenTotal],
  );

  const kpis = useMemo<KpiItem[]>(
    () => [
      {
        label: "Transacciones Hoy",
        value: hoy.length.toLocaleString("es-MX"),
        icon: ClockIcon,
        iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
        iconClass: "text-sky-500",
        trendLabel: `${items.length > 0 ? Math.round((hoy.length / items.length) * 100) : 0}% del total`,
        status: "positive",
        progress: items.length > 0 ? Math.round((hoy.length / items.length) * 100) : 0,
      },
      {
        label: "Discrepancias Críticas",
        value: discrepancies.length.toLocaleString("es-MX"),
        icon: ErrorIcon,
        iconBgClass: "bg-red-50 dark:bg-red-500/10",
        iconClass: "text-red-500",
        trendLabel: `${items.length > 0 ? Math.round((discrepancies.length / items.length) * 100) : 0}% del total`,
        status: discrepancies.length > 0 ? "negative" : "positive",
        progress: items.length > 0 ? Math.round((discrepancies.length / items.length) * 100) : 0,
      },
      {
        label: "Volumen de Tela (m)",
        value: formattedVolumen,
        icon: InventariosIcon,
        iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
        iconClass: "text-amber-500",
        trendLabel: `${items.length} transacciones`,
        status: "neutral",
        progress: 100,
      },
      {
        label: "Precisión Auditoría",
        value: `${precision}%`,
        icon: CheckCircleIcon,
        iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
        iconClass: "text-emerald-500",
        trendLabel: `${items.length - discrepancies.length} de ${items.length} sin incidencias`,
        status: precision >= 95 ? "positive" : precision >= 80 ? "neutral" : "negative",
        progress: precision,
      },
    ],
    [hoy, discrepancies, items.length, formattedVolumen, precision],
  );

  return <KpiGrid items={kpis} />;
});

// ─── Vista principal ─────────────────────────────────────────────────────────

export function StockMovementsView() {
  const {
    stockMovements = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useStockMovements();

  const columns = useMemo(() => getStockMovementsColumns(), []);


  // ── Estados de carga y error ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">Cargando movimientos...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Error al cargar movimientos de inventario
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <MovementsStats items={stockMovements} />

      {/* ── Tabla de movimientos ─────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={stockMovements}
        title="Movimientos de Inventario"
        searchPlaceholder="Buscar por tipo, folio, origen o destino..."
        actionButton={<StockMovementForm />}
        filterConfig={stockMovementsFilterConfig}
        onRefetch={refetch}
        isRefetching={isFetching}
      />
    </div>
  );
}
