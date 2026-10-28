"use client";

import { CheckCircleIcon } from "@/src/components/Icons";
import { SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import { MetricCard } from "@/src/components/ProgressPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { clampPercentage } from "@/src/utils/percentage";
import type { ResumenAvance } from "../interfaces/embroidery.interface";

interface EmbroideryProgressSummaryProps {
  resumenAvance: ResumenAvance;
}

/**
 * Resumen de avance de la orden: SOLO las cifras globales de la OB —piezas
 * programadas, piezas bordadas y el porcentaje—, que vienen ya calculadas en
 * `resumen_avance`.
 *
 * Desde que el avance se captura por OB (EC-491) no hay desglose por talla que
 * enseñar: `por_detalle` se sigue recibiendo, pero los avances nuevos caen en
 * una sola fila sin talla y los antiguos por talla no justifican conservar la
 * tabla. Tampoco se pinta el avance en puntadas: su presupuesto
 * (`puntadas_presupuesto`) es el conteo de UNA prenda y no es comparable con
 * las puntadas bordadas de todas las piezas.
 */
export function EmbroideryProgressSummary({
  resumenAvance,
}: EmbroideryProgressSummaryProps) {
  // Sin piezas programadas no hay fracción que enunciar: el % se muestra como
  // guion en vez de un "0%" que se leería como "nada bordado de algo".
  const hasProgrammed = resumenAvance.cantidad_programada > 0;
  const pctWidth = hasProgrammed ? clampPercentage(resumenAvance.porcentaje_avance) : 0;

  return (
    <SheetSection
      icon={<CheckCircleIcon className="w-5 h-5" />}
      title="Resumen de avance"
      subtitle="Piezas bordadas contra las programadas en esta orden."
    >
      <MetricCard
        label="Piezas bordadas"
        done={formatQuantityValue(resumenAvance.cantidad_bordada_total)}
        total={formatQuantityValue(resumenAvance.cantidad_programada)}
        hint={hasProgrammed ? undefined : "La orden no tiene piezas programadas"}
      />

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 dark:text-slate-400">Avance general</span>
          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
            {hasProgrammed ? `${formatQuantityValue(resumenAvance.porcentaje_avance)}%` : "—"}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pctWidth}%` }}
          />
        </div>
      </div>
    </SheetSection>
  );
}
