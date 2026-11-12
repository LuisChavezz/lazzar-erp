"use client";

import { Button } from "@/src/components/Button";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { EmptyLines, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { LayersIcon } from "@/src/components/Icons";
import { OrderChip, SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import type {
  ProductionOrderConsumo,
  ProductionOrderConsumoResumen,
} from "@/src/features/production-orders/interfaces/production-order.interface";
import {
  consumptionProductName,
  labelConsumptionRecords,
  productFallbackName,
} from "../utils/consumptionRecords";
import {
  formatBackendQuantity,
  formatSignedBackendQuantity,
} from "../utils/formatConsumptionQuantity";

interface ProductionOrderConsumptionSectionProps {
  /** Registros en bruto de `onboarding?op_id=`, para el historial. */
  consumos: ProductionOrderConsumo[];
  /** `consumos_resumen` del backend (EC-880): una fila por material. */
  products: ProductionOrderConsumoResumen[];
  /** La OP está Completada o Cancelada: el backend ya no admite el recálculo. */
  isClosed: boolean;
  onRecalculate: () => void;
}

/**
 * Sección "Consumos" del detalle de OP: una fila por PRODUCTO (planeado,
 * ajustes, actual) y, plegado, el historial de registros tal como llegan.
 *
 * Las filas son `consumos_resumen` TAL CUAL las resuelve el backend (EC-880),
 * la misma regla que aplica el recálculo: aquí no se suma ni se resta nada. Un
 * material que solo aparece en un ajuste trae planeado 0.
 *
 * Las cantidades van con `formatExactQuantityValue` (4 decimales), nunca
 * redondeadas: son la resolución con que el inventario mueve materiales, y
 * truncarlas impediría cuadrarlas contra sus movimientos.
 *
 * El botón no lleva gate de permiso: lo ve quien ve la OP y el backend decide
 * (400 `permiso`, que el diálogo muestra). Solo se apaga cuando la acción es
 * imposible: OP cerrada o sin consumos.
 */
export function ProductionOrderConsumptionSection({
  consumos,
  products,
  isClosed,
  onRecalculate,
}: ProductionOrderConsumptionSectionProps) {
  const disabledReason = isClosed
    ? "La orden está completada o cancelada: ya no se pueden recalcular sus consumos."
    : products.length === 0
      ? "La orden no tiene consumos que recalcular."
      : undefined;

  return (
    // Sección de "hoja" (mismo lenguaje que el detalle del pedido y el resto
    // del detalle de OP).
    <SheetSection
      icon={<LayersIcon className="w-5 h-5" />}
      title="Consumos"
      subtitle="Material planeado, ajustes y consumo actual por producto."
      badges={
        <OrderChip>
          {products.length} {products.length === 1 ? "producto" : "productos"}
        </OrderChip>
      }
      action={
        // El `title` va en un envoltorio: un botón deshabilitado no muestra
        // su propio tooltip en todos los navegadores.
        <span title={disabledReason}>
          <Button variant="secondary" onClick={onRecalculate} disabled={disabledReason !== undefined}>
            Recalcular consumos
          </Button>
        </span>
      }
    >
      {/* El vacío es por REGISTROS, no por productos: un registro sin renglones
          sigue existiendo y se ve en el historial (como lo mostraba la tarjeta
          por registro que esta sección reemplazó). */}
      {consumos.length === 0 ? (
        <EmptyLines>Esta orden no tiene consumos de material registrados.</EmptyLines>
      ) : (
        <div className="space-y-4">
          {products.length === 0 ? (
            <EmptyLines>Los registros de consumo de esta orden no tienen renglones.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium">Unidad</th>
                  <th className="px-3 py-2 font-medium text-right">Planeado</th>
                  <th className="px-3 py-2 font-medium text-right">Ajustes</th>
                  <th className="px-3 py-2 font-medium text-right">Actual</th>
                </>
              }
            >
              {products.map((product) => (
                <tr key={product.producto}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {consumptionProductName(product)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {textOrDash(product.unidad)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatBackendQuantity(product.planeado)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatSignedBackendQuantity(product.ajustes)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                    {formatBackendQuantity(product.actual)}
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}

          <ConsumptionHistory consumos={consumos} />
        </div>
      )}
    </SheetSection>
  );
}

// ── Historial ─────────────────────────────────────────────────────────────────

/** Rótulo de cada registro del historial (`StatusBadge`, clave = tipo de registro). */
const RECORD_BADGE_CFG: Record<"original" | "ajuste", StatusBadgeConfigEntry> = {
  original: {
    label: "Original",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  ajuste: {
    label: "Ajuste",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

/**
 * Registros de consumo en bruto, del más antiguo al más reciente, plegados por
 * defecto. El consumo inicial (el primero con renglones) es el "Original";
 * cada recálculo agrega un "Ajuste" con cantidades firmadas (el original nunca
 * se edita).
 */
function ConsumptionHistory({ consumos }: { consumos: ProductionOrderConsumo[] }) {
  const records = labelConsumptionRecords(consumos);

  return (
    <details className="rounded-xl border border-slate-200 dark:border-white/10">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white">
        Historial de registros ({records.length})
      </summary>
      <div className="space-y-4 border-t border-slate-100 dark:border-white/10 p-4">
        {records.map(({ record, isOriginal }) => {
          return (
            <div key={record.consumo_produccion_id} className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Consumo #{record.consumo_produccion_id}
                </h4>
                <StatusBadge
                  status={isOriginal ? "original" : "ajuste"}
                  config={RECORD_BADGE_CFG}
                />
              </div>
              {record.detalles.length === 0 ? (
                <EmptyLines>Este consumo no tiene renglones registrados.</EmptyLines>
              ) : (
                <LineItemsTable
                  head={
                    <>
                      <th className="px-3 py-2 font-medium">Producto</th>
                      <th className="px-3 py-2 font-medium text-right">Cantidad</th>
                    </>
                  }
                >
                  {record.detalles.map((detalle, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                        {detalle.producto_nombre?.trim() || productFallbackName(detalle.producto)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                        {isOriginal
                          ? formatBackendQuantity(detalle.cantidad)
                          : formatSignedBackendQuantity(detalle.cantidad)}
                      </td>
                    </tr>
                  ))}
                </LineItemsTable>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
