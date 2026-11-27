"use client";

import { useState } from "react";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { DateParamInput } from "@/src/components/DateParamInput";
import {
  MOVEMENT_DATE_PRESETS,
  activeMovementDatePreset,
  movementDatePresetRange,
} from "../utils/movementDatePresets";

interface ReportDateRangeFieldsProps {
  fechaInicio: string | null;
  fechaFinal: string | null;
  onChange: (fechaInicio: string | null, fechaFinal: string | null) => void;
}

/**
 * "Desde" / "Hasta" de un reporte por periodo, con atajos (Hoy, 7 días, Este
 * mes, Mes anterior). Un rango invertido no se propaga: se avisa debajo. Las
 * fechas son `YYYY-MM-DD`, así que comparar strings es cronológico; los
 * `min`/`max` nativos solo cubren el calendario, no lo tecleado.
 */
export function ReportDateRangeFields({ fechaInicio, fechaFinal, onChange }: ReportDateRangeFieldsProps) {
  const [dateError, setDateError] = useState<string | null>(null);

  const emit = (inicio: string | null, final: string | null) => {
    if (inicio && final && inicio > final) {
      setDateError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setDateError(null);
    onChange(inicio, final);
  };

  const presetActivo = activeMovementDatePreset(fechaInicio, fechaFinal);

  return (
    <>
      {/* Solo se propagan días completos con año plausible (ver
          `DateParamInput`). Vaciar un campo se confirma al salir de él. */}
      <div className="w-40">
        <DateParamInput
          label="Desde"
          name="fecha_inicio"
          className={COMPACT_FIELD_CLS}
          value={fechaInicio ?? ""}
          max={fechaFinal ?? undefined}
          onCommit={(value) => emit(value || null, fechaFinal)}
        />
      </div>

      <div className="w-40">
        <DateParamInput
          label="Hasta"
          name="fecha_final"
          className={COMPACT_FIELD_CLS}
          value={fechaFinal ?? ""}
          min={fechaInicio ?? undefined}
          onCommit={(value) => emit(fechaInicio, value || null)}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 pb-0.5" role="group" aria-label="Periodos rápidos">
        {MOVEMENT_DATE_PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={presetActivo === key}
            onClick={() => emit(...movementDatePresetRange(key))}
            className={`h-8 cursor-pointer rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
              presetActivo === key
                ? "bg-accent text-accent-foreground"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {dateError && (
        <p role="alert" className="ml-1 basis-full text-xs font-medium text-red-600 dark:text-red-400">
          {dateError}
        </p>
      )}
    </>
  );
}
