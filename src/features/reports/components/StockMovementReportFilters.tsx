"use client";

import { useState } from "react";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { DateParamInput } from "@/src/features/attendance/components/DateParamInput";
import { FormSelect } from "@/src/components/FormSelect";
// Se reutiliza el MISMO selector de almacén de existencias (StockView) en vez
// de duplicarlo: solo depende de `useWarehouses` y ya lista únicamente
// almacenes activos, ordenados alfabéticamente, con el estilo del proyecto.
import { WarehouseFilter } from "@/src/features/stock/components/WarehouseFilter";
import { STOCK_MOVEMENT_REPORT_TYPE_CONFIG } from "@/src/features/stock/constants/stockMovementReportTypes";
import type { StockMovementReportType } from "@/src/features/stock/interfaces/stock-movement-report.interface";

interface StockMovementReportFiltersProps {
  /** Tipo de movimiento seleccionado, o `null` si aún no se elige (obligatorio). */
  tipoMovimiento: StockMovementReportType | null;
  /** Almacén seleccionado, o `null` (OPCIONAL en este reporte). */
  almacenId: number | null;
  /** Inicio del rango (`YYYY-MM-DD`), o `null`. */
  fechaInicio: string | null;
  /** Fin del rango (`YYYY-MM-DD`), o `null`. */
  fechaFinal: string | null;
  onTipoChange: (tipo: StockMovementReportType | null) => void;
  onAlmacenChange: (almacenId: number | null) => void;
  onDateRangeChange: (
    fechaInicio: string | null,
    fechaFinal: string | null,
  ) => void;
}

/**
 * Barra de filtros (gate) del reporte de movimientos por periodo.
 *
 * Componente controlado: el estado vive en el contenedor, que decide qué
 * mostrar DEBAJO de este gate. La consulta no se dispara hasta que están el tipo
 * de movimiento + fecha inicio + fecha final; ese gate lo hace el contenedor vía
 * `gateComplete` y el `enabled` del hook. A diferencia de existencias, el
 * ALMACÉN es OPCIONAL: no forma parte del gate (sin almacén ⇒ todos).
 */
export function StockMovementReportFilters({
  tipoMovimiento,
  almacenId,
  fechaInicio,
  fechaFinal,
  onTipoChange,
  onAlmacenChange,
  onDateRangeChange,
}: StockMovementReportFiltersProps) {
  const [dateError, setDateError] = useState<string | null>(null);

  // Valida el rango antes de propagarlo: un rango invertido NO debe disparar la
  // consulta. Las fechas son `YYYY-MM-DD` (input `type="date"`), así que la
  // comparación de strings es cronológica. Los `min`/`max` nativos ya evitan el
  // caso al elegir con el calendario; esto cubre la entrada tecleada, donde son
  // solo indicativos.
  const emitDateRange = (inicio: string | null, final: string | null) => {
    if (inicio && final && inicio > final) {
      setDateError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setDateError(null);
    onDateRangeChange(inicio, final);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-52">
          <FormSelect
            label="Tipo de movimiento"
            className={COMPACT_FIELD_CLS}
            value={tipoMovimiento ?? ""}
            onChange={(e) =>
              onTipoChange(
                (e.target.value || null) as StockMovementReportType | null,
              )
            }
          >
            <option
              value=""
              disabled
              className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900"
            >
              Selecciona un tipo
            </option>
            {Object.entries(STOCK_MOVEMENT_REPORT_TYPE_CONFIG).map(([value, cfg]) => (
              <option
                key={value}
                value={value}
                className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900"
              >
                {cfg.label}
              </option>
            ))}
          </FormSelect>
        </div>

        {/* Almacén: OPCIONAL. Sin selección ⇒ el reporte incluye todos.
            `allowClear` habilita "Todos los almacenes" para volver a `null`
            sin perder el tipo de movimiento ni el rango de fechas. */}
        <WarehouseFilter
          value={almacenId}
          onChange={onAlmacenChange}
          allowClear
          className={COMPACT_FIELD_CLS}
        />

        {/* Solo se propagan días completos con año plausible (ver
            `DateParamInput`): teclear el año no consulta con cada dígito. Vaciar
            un campo se confirma al salir de él. */}
        <div className="w-44">
          <DateParamInput
            label="Desde"
            name="fecha_inicio"
            className={COMPACT_FIELD_CLS}
            value={fechaInicio ?? ""}
            max={fechaFinal ?? undefined}
            onCommit={(value) => emitDateRange(value || null, fechaFinal)}
          />
        </div>

        <div className="w-44">
          <DateParamInput
            label="Hasta"
            name="fecha_final"
            className={COMPACT_FIELD_CLS}
            value={fechaFinal ?? ""}
            min={fechaInicio ?? undefined}
            onCommit={(value) => emitDateRange(fechaInicio, value || null)}
          />
        </div>
      </div>

      {dateError && (
        <p className="ml-1 text-xs font-medium text-red-600 dark:text-red-400">
          {dateError}
        </p>
      )}
    </div>
  );
}
