"use client";

import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { InfoTile, InfoTileGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  DownloadIcon,
  HistoryIcon,
  InventariosIcon,
  LayersIcon,
  UploadIcon,
  WarehouseIcon,
} from "@/src/components/Icons";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import type {
  MovementLedgerSummary as MovementLedgerSummaryData,
  MovementLedgerVariant,
} from "@/src/features/stock/interfaces/movement-ledger.interface";

interface MovementLedgerSummaryProps {
  variante: MovementLedgerVariant;
  resumen: MovementLedgerSummaryData;
}

/**
 * Encabezado del kardex: la variante resuelta y los totales del periodo
 * (`resumen`, calculado por el backend; no se recalcula desde las filas).
 */
export function MovementLedgerSummary({ variante, resumen }: MovementLedgerSummaryProps) {
  // Stock cargado sin movimiento (carga inicial): ya viene sumado al saldo
  // inicial; se aclara solo cuando existe, para explicar por qué el saldo no
  // arranca en el primer movimiento.
  const sinMovimiento = resumen.existencia_sin_movimiento;
  const sinMovimientoNote =
    Number(sinMovimiento) !== 0
      ? `Incluye ${formatExactQuantityValue(sinMovimiento)} de existencia sin movimiento`
      : undefined;

  const items: KpiItem[] = [
    {
      label: "Saldo inicial",
      value: formatExactQuantityValue(resumen.saldo_inicial),
      subLabel: sinMovimientoNote,
      icon: HistoryIcon,
      iconBgClass: "bg-slate-100 dark:bg-slate-500/10",
      iconClass: "text-slate-500",
      status: "neutral",
    },
    {
      label: "Total entradas",
      value: formatExactQuantityValue(resumen.total_entradas),
      icon: DownloadIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      status: "neutral",
    },
    {
      label: "Total salidas",
      value: formatExactQuantityValue(resumen.total_salidas),
      icon: UploadIcon,
      iconBgClass: "bg-rose-50 dark:bg-rose-500/10",
      iconClass: "text-rose-500",
      status: "neutral",
    },
    {
      label: "Saldo final",
      value: formatExactQuantityValue(resumen.saldo_final),
      icon: InventariosIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      status: "neutral",
    },
    {
      label: "Existencia actual",
      value: formatExactQuantityValue(resumen.existencia_actual),
      icon: WarehouseIcon,
      iconBgClass: "bg-violet-50 dark:bg-violet-500/10",
      iconClass: "text-violet-500",
      status: "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="movement-ledger-variant"
        className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <LayersIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Variante
            </p>
            <h2
              id="movement-ledger-variant"
              className="truncate text-lg font-bold text-slate-900 dark:text-white font-display"
            >
              {variante.sku}
            </h2>
          </div>
          {!variante.activo && <StatusBadge status="inactivo" config={ACTIVO_INACTIVO_CFG} />}
        </div>
        <InfoTileGrid>
          <InfoTile label="SKU de producción">{textOrDash(variante.sku_produccion)}</InfoTile>
          <InfoTile label="Descripción">{textOrDash(variante.descripcion)}</InfoTile>
          <InfoTile label="Color">{textOrDash(variante.color)}</InfoTile>
          <InfoTile label="Talla">{textOrDash(variante.talla)}</InfoTile>
        </InfoTileGrid>
      </section>

      <KpiGrid items={items} />
    </div>
  );
}
