"use client";

import { Button } from "@/src/components/Button";
import {
  EmptyLines,
  LineItemsTable,
  Section,
} from "@/src/components/DetailDialogPrimitives";
import type { ProductionOrderConsumo } from "@/src/features/production-orders/interfaces/production-order.interface";
import {
  labelConsumptionRecords,
  productFallbackName,
  type ProductConsumption,
} from "../utils/summarizeConsumption";
import {
  formatConsumptionQuantity,
  formatSignedConsumptionQuantity,
} from "../utils/formatConsumptionQuantity";

interface ProductionOrderConsumptionSectionProps {
  /** Registros en bruto de `onboarding?op_id=`, para el historial. */
  consumos: ProductionOrderConsumo[];
  /** `summarizeConsumption(consumos)`: lo calcula la página, que también se lo da al diálogo. */
  products: ProductConsumption[];
  /** La OP está Completada o Cancelada: el backend ya no admite el recálculo. */
  isClosed: boolean;
  onRecalculate: () => void;
}

/**
 * Sección "Consumos" del detalle de OP: una fila por PRODUCTO (planeado,
 * ajustes, actual) y, plegado, el historial de registros tal como llegan.
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
    <Section
      title={`Consumos (${products.length})`}
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
      {products.length === 0 ? (
        <EmptyLines>Esta orden no tiene consumos de material registrados.</EmptyLines>
      ) : (
        <div className="space-y-4">
          <LineItemsTable
            head={
              <>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium text-right">Planeado</th>
                <th className="px-3 py-2 font-medium text-right">Ajustes</th>
                <th className="px-3 py-2 font-medium text-right">Actual</th>
              </>
            }
          >
            {products.map((product) => (
              <tr key={product.producto}>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                  {product.producto_nombre}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {formatConsumptionQuantity(product.planned)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {formatSignedConsumptionQuantity(product.adjustments)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                  {formatConsumptionQuantity(product.current)}
                </td>
              </tr>
            ))}
          </LineItemsTable>

          <ConsumptionHistory consumos={consumos} />
        </div>
      )}
    </Section>
  );
}

// ── Historial ─────────────────────────────────────────────────────────────────

const RECORD_BADGE = {
  original: {
    label: "Original",
    cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  },
  ajuste: {
    label: "Ajuste",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
} as const;

/**
 * Registros de consumo en bruto, del más antiguo al más reciente, plegados por
 * defecto. El primero de la OP es el "Original"; cada recálculo agrega un
 * "Ajuste" con cantidades firmadas (el original nunca se edita).
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
          const badge = isOriginal ? RECORD_BADGE.original : RECORD_BADGE.ajuste;
          return (
            <div key={record.consumo_produccion_id} className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Consumo #{record.consumo_produccion_id}
                </h4>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.cls}`}
                >
                  {badge.label}
                </span>
              </div>
              {record.detalles.length === 0 ? (
                <EmptyLines>Este registro no tiene renglones.</EmptyLines>
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
                          ? formatConsumptionQuantity(detalle.cantidad)
                          : formatSignedConsumptionQuantity(detalle.cantidad)}
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
