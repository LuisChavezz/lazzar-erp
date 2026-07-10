"use client";

import { useState } from "react";
import { FormInput } from "@/src/components/FormInput";
// Se reutiliza el MISMO selector de almacén de existencias (StockView) en vez
// de duplicarlo: solo depende de `useWarehouses` y ya lista únicamente
// almacenes activos, ordenados alfabéticamente, con el estilo del proyecto.
import { WarehouseFilter } from "@/src/features/stock/components/WarehouseFilter";

interface StockReportFiltersProps {
  /** Almacén seleccionado, o `null` si aún no se elige. */
  almacenId: number | null;
  /** Inicio del rango (`YYYY-MM-DD`), o `null`. */
  fechaInicio: string | null;
  /** Fin del rango (`YYYY-MM-DD`), o `null`. */
  fechaFinal: string | null;
  onAlmacenChange: (almacenId: number) => void;
  onDateRangeChange: (
    fechaInicio: string | null,
    fechaFinal: string | null,
  ) => void;
}

/**
 * Barra de filtros (gate) del reporte de existencias por periodo.
 *
 * Componente controlado: el estado vive en la página, que decide qué mostrar
 * DEBAJO de este gate. La consulta no se dispara hasta que están los tres
 * valores (almacén + fecha inicio + fecha final); ese gate lo hace el padre
 * vía `gateComplete` y el `enabled` del hook.
 */
export function StockReportFilters({
  almacenId,
  fechaInicio,
  fechaFinal,
  onAlmacenChange,
  onDateRangeChange,
}: StockReportFiltersProps) {
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
        <WarehouseFilter value={almacenId} onChange={onAlmacenChange} />

        <div className="w-44">
          <FormInput
            label="Desde"
            type="date"
            value={fechaInicio ?? ""}
            // `max` impide elegir un inicio posterior al fin ya seleccionado.
            max={fechaFinal ?? undefined}
            onChange={(e) => emitDateRange(e.target.value || null, fechaFinal)}
          />
        </div>

        <div className="w-44">
          <FormInput
            label="Hasta"
            type="date"
            value={fechaFinal ?? ""}
            // `min` impide elegir un fin anterior al inicio ya seleccionado.
            min={fechaInicio ?? undefined}
            onChange={(e) => emitDateRange(fechaInicio, e.target.value || null)}
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
