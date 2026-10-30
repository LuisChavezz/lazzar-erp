"use client";

import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, InfoGrid, Section, textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  DownloadIcon,
  HistoryIcon,
  InventariosIcon,
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
      <Section
        title={variante.sku}
        action={
          variante.activo ? undefined : (
            <StatusBadge status="inactivo" config={ACTIVO_INACTIVO_CFG} />
          )
        }
      >
        <InfoGrid>
          <InfoField label="SKU de producción">{textOrDash(variante.sku_produccion)}</InfoField>
          <InfoField label="Descripción">{textOrDash(variante.descripcion)}</InfoField>
          <InfoField label="Color">{textOrDash(variante.color)}</InfoField>
          <InfoField label="Talla">{textOrDash(variante.talla)}</InfoField>
        </InfoGrid>
      </Section>

      <KpiGrid items={items} />
    </div>
  );
}
