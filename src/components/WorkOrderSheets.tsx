"use client";

import type { ReactNode } from "react";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { TrendingUpIcon } from "@/src/components/Icons";
import { OrderChip, SheetPanel, SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { pluralForQuantity } from "@/src/utils/plural";

/**
 * Piezas de "hoja" compartidas por los detalles de órdenes de trabajo
 * (bordado, reflejante, corte de manga): mismo armazón que el detalle del
 * pedido, para que las tres páginas se lean igual.
 */

/**
 * Barra superior fija con "Volver" y, a la derecha, el aviso de solo lectura
 * (si aplica) y las acciones de la página (`actions`, p. ej. "Descargar PDF").
 * Sin `actions` se pinta exactamente como antes de existir el slot.
 */
export function WorkOrderTopBar({
  backLink,
  readOnlyLabel,
  actions,
}: {
  backLink: ReactNode;
  readOnlyLabel?: string | null;
  actions?: ReactNode;
}) {
  const readOnlyChip = readOnlyLabel && <OrderChip>{readOnlyLabel}</OrderChip>;
  return (
    <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none px-6 md:px-8 py-3">
      {backLink}
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">
          {readOnlyChip}
          {actions}
        </div>
      ) : (
        readOnlyChip
      )}
    </div>
  );
}

/**
 * "Cobertura del pedido": barra de lo que esta orden programa contra lo
 * contratado, y a la derecha las otras órdenes del mismo pedido.
 */
export function WorkOrderCoverageSheet({
  cubierta,
  contratada,
  completa,
  coverageConfig,
  servicio,
  siblings,
  siblingsCount,
  notice,
}: {
  cubierta: number;
  contratada: number;
  completa: boolean;
  coverageConfig: Record<string, StatusBadgeConfigEntry>;
  /** "reflejante", "corte de manga"… para "otras órdenes de …". */
  servicio: string;
  siblings: ReactNode;
  siblingsCount: number;
  /** Aviso opcional bajo la barra (p. ej. reparto aproximado). */
  notice?: ReactNode;
}) {
  const porcentaje = contratada > 0 ? Math.round((cubierta / contratada) * 100) : null;
  return (
    <SheetSection
      icon={<TrendingUpIcon className="w-5 h-5" />}
      title="Cobertura del pedido"
      subtitle="Cuánto de lo contratado por el pedido programa esta orden."
      badges={<StatusBadge status={String(completa)} config={coverageConfig} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SheetPanel className="lg:col-span-2 p-5!">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
            <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatQuantityValue(cubierta)}
              </span>{" "}
              de {formatQuantityValue(contratada)}{" "}
              {pluralForQuantity(contratada, "pieza contratada", "piezas contratadas")}
            </p>
            {porcentaje !== null && (
              <span
                className={`text-lg font-bold tabular-nums ${
                  completa ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {porcentaje}%
              </span>
            )}
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completa ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, porcentaje ?? 0)}%` }}
            />
          </div>
          {!completa && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              El resto puede programarse en otras órdenes de {servicio}.
            </p>
          )}
          {notice && <div className="mt-4">{notice}</div>}
        </SheetPanel>

        <SheetPanel title={`Otras órdenes del pedido (${siblingsCount})`} className="p-5!">
          {siblingsCount > 0 ? (
            siblings
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Es la única orden de {servicio} de este pedido.
            </p>
          )}
        </SheetPanel>
      </div>
    </SheetSection>
  );
}
