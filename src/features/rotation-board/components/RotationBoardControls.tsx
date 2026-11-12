"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/Button";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import type {
  RotationAgrupar,
  RotationBoardParametros,
} from "../interfaces/rotation-board.interface";
import {
  ROTATION_CONTROL_LIMITS,
  rotationControlSchemas,
  type RotationNumericControl,
} from "../schemas/rotationBoardControls.schema";

/** Pausa antes de aplicar un campo numérico: no se consulta a cada tecla. */
export const ROTATION_CONTROL_DEBOUNCE_MS = 500;

interface NumericSettingFieldProps {
  name: RotationNumericControl;
  label: string;
  /** Valor vigente (el de la URL). */
  value: number;
  onCommit: (value: number) => void;
}

/**
 * Campo numérico de un ajuste. Lo tecleado es un BORRADOR: se valida con el
 * mismo rango que el backend y, si es válido, se aplica tras
 * `ROTATION_CONTROL_DEBOUNCE_MS`. Un valor inválido muestra su motivo y no se
 * aplica (la tabla sigue con el último válido). Si el valor cambia por fuera
 * (navegar atrás) y no hay nada pendiente, el borrador lo refleja.
 */
function NumericSettingField({ name, label, value, onCommit }: NumericSettingFieldProps) {
  const [draft, setDraft] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const [isPending, setIsPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (value !== syncedValue) {
    setSyncedValue(value);
    if (!isPending) setDraft(String(value));
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const parsed = rotationControlSchemas[name].safeParse(draft);
  const errorMessage = parsed.success ? undefined : parsed.error.issues[0]?.message;
  const { min, max } = ROTATION_CONTROL_LIMITS[name];

  const handleChange = (next: string) => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const result = rotationControlSchemas[name].safeParse(next);
    if (!result.success) {
      setIsPending(false);
      return;
    }
    setIsPending(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsPending(false);
      onCommit(result.data);
    }, ROTATION_CONTROL_DEBOUNCE_MS);
  };

  return (
    <div className="w-36">
      <FormInput
        id={`rotation-${name}`}
        name={name}
        label={label}
        variant="compact"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        aria-invalid={errorMessage ? true : undefined}
        error={errorMessage ? { message: errorMessage } : undefined}
      />
    </div>
  );
}

interface RotationBoardControlsProps {
  semanas: number;
  semanasObjetivo: number;
  diasSinVenta: number;
  agrupar: RotationAgrupar;
  /** Eco del backend: periodo realmente calculado (`desde`–`hasta`). */
  parametros: RotationBoardParametros | undefined;
  onSemanasChange: (value: number) => void;
  onSemanasObjetivoChange: (value: number) => void;
  onDiasSinVentaChange: (value: number) => void;
  onAgruparChange: (value: RotationAgrupar) => void;
  onReset: () => void;
}

/**
 * Parámetros de CÁLCULO del tablero (no filtros): periodo, semanas objetivo,
 * umbral sin venta y agrupación. Viven en la URL, "Limpiar filtros" de la
 * tabla no los toca y "Restablecer" los devuelve a sus valores por defecto.
 */
export function RotationBoardControls({
  semanas,
  semanasObjetivo,
  diasSinVenta,
  agrupar,
  parametros,
  onSemanasChange,
  onSemanasObjetivoChange,
  onDiasSinVentaChange,
  onAgruparChange,
  onReset,
}: RotationBoardControlsProps) {
  // Restablecer remonta los campos: un borrador inválido ("0") se descarta
  // aunque el valor vigente ya fuera el de por defecto.
  const [resetCount, setResetCount] = useState(0);
  const handleReset = () => {
    setResetCount((count) => count + 1);
    onReset();
  };

  return (
    <section
      aria-label="Parámetros de cálculo"
      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3"
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <NumericSettingField
          key={`semanas-${resetCount}`}
          name="semanas"
          label="Semanas de análisis"
          value={semanas}
          onCommit={onSemanasChange}
        />
        <NumericSettingField
          key={`semanas_objetivo-${resetCount}`}
          name="semanas_objetivo"
          label="Semanas objetivo"
          value={semanasObjetivo}
          onCommit={onSemanasObjetivoChange}
        />
        <NumericSettingField
          key={`dias_sin_venta-${resetCount}`}
          name="dias_sin_venta"
          label="Días sin venta"
          value={diasSinVenta}
          onCommit={onDiasSinVentaChange}
        />
        <div className="w-40">
          <FormSelect
            id="rotation-agrupar"
            name="agrupar"
            label="Agrupar por"
            value={agrupar}
            onChange={(event) => onAgruparChange(event.target.value as RotationAgrupar)}
            className="py-1.5! text-xs! rounded-md!"
            options={[
              { value: "variante", label: "Variante (SKU)" },
              { value: "producto", label: "Producto (modelo)" },
            ]}
          />
        </div>
        <div className="flex flex-1 flex-wrap items-end justify-end gap-3 self-end">
          {parametros && (
            <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
              Periodo: {formatShortCalendarDate(parametros.desde)} –{" "}
              {formatShortCalendarDate(parametros.hasta)}
            </p>
          )}
          {/* Siempre disponible: también descarta un borrador inválido. */}
          <Button
            variant="secondary"
            onClick={handleReset}
            title="Volver a 12 semanas, 8 semanas objetivo, 90 días sin venta y agrupación por variante"
          >
            Restablecer
          </Button>
        </div>
      </div>
    </section>
  );
}
