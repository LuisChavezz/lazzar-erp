"use client";

import { FormSelect } from "./FormSelect";
import {
  SAT_CANCEL_MOTIVES,
  formatSatCancelMotive,
  isSatCancelMotive,
  type SatCancelMotive,
} from "@/src/constants/satCancelMotives";

interface SatCancelMotiveSelectProps {
  id: string;
  /** Lo elegido en esta apertura del diálogo; `null` mientras no se elija (sin valor por defecto). */
  value: SatCancelMotive | null;
  onChange: (value: SatCancelMotive) => void;
  /**
   * Motivo fijo (`getLockedSatCancelMotive`): con él el selector lo muestra
   * deshabilitado y `value` no se usa.
   */
  lockedMotive: SatCancelMotive | null;
  disabled?: boolean;
  /** Mensaje de validación bajo el campo (p. ej. al confirmar sin elegir). */
  error?: string | null;
}

/** Mismo estilo de opción que `FormSelect` con `options`. */
const OPTION_CLASS = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

/** Explicación del motivo fijo. */
export const SAT_CANCEL_MOTIVE_LOCKED_HINT =
  "Fijo: ya se pidió la cancelación ante el SAT con este motivo (pendiente de aceptar o sin respuesta) y el reintento usa el mismo.";

/** Texto de ayuda con el motivo libre. */
const SAT_CANCEL_MOTIVE_FREE_HINT = "Es el motivo que se envía al SAT.";

/**
 * Lo que pinta el selector (sin JSX, para probarlo): el valor mostrado (`""`
 * es "Selecciona un motivo"), si queda bloqueado y la ayuda. Con motivo fijo
 * gana ese motivo aunque se hubiera elegido otro.
 */
export const getSatCancelMotiveSelectView = ({
  value,
  lockedMotive,
  disabled = false,
}: {
  value: SatCancelMotive | null;
  lockedMotive: SatCancelMotive | null;
  disabled?: boolean;
}): { shown: SatCancelMotive | ""; disabled: boolean; hint: string } => ({
  shown: lockedMotive ?? value ?? "",
  disabled: disabled || lockedMotive !== null,
  hint: lockedMotive !== null ? SAT_CANCEL_MOTIVE_LOCKED_HINT : SAT_CANCEL_MOTIVE_FREE_HINT,
});

/**
 * Selector del motivo SAT de una cancelación de CFDI (factura o REP), del
 * catálogo único `SAT_CANCEL_MOTIVES`. Obligatorio y SIN valor por defecto:
 * arranca en "Selecciona un motivo" y quien lo monta deja confirmar solo con
 * un motivo. Con `lockedMotive` muestra ese motivo bloqueado y explica por qué.
 *
 * Solo se monta cuando la acción va a cancelar un CFDI vigente ante el SAT.
 */
export function SatCancelMotiveSelect({
  id,
  value,
  onChange,
  lockedMotive,
  disabled = false,
  error,
}: SatCancelMotiveSelectProps) {
  const helpId = `${id}-help`;
  const view = getSatCancelMotiveSelectView({ value, lockedMotive, disabled });

  return (
    <div className="space-y-1">
      <FormSelect
        id={id}
        name="motivo_sat"
        label="Motivo de cancelación ante el SAT"
        value={view.shown}
        // `aria-required` y no `required`: el bloqueo y su mensaje los pone
        // quien lo monta (validación del formulario o Confirmar deshabilitado),
        // no la burbuja nativa del navegador.
        aria-required
        disabled={view.disabled}
        aria-describedby={helpId}
        aria-invalid={error ? true : undefined}
        error={error ? { message: error } : undefined}
        onChange={(event) => {
          const next = event.target.value;
          if (isSatCancelMotive(next)) onChange(next);
        }}
      >
        <option value="" disabled className={OPTION_CLASS}>
          Selecciona un motivo
        </option>
        {SAT_CANCEL_MOTIVES.map((motive) => (
          <option key={motive.value} value={motive.value} className={OPTION_CLASS}>
            {formatSatCancelMotive(motive.value)}
          </option>
        ))}
      </FormSelect>
      <p id={helpId} className="ml-1 text-xs text-slate-500 dark:text-slate-400">
        {view.hint}
      </p>
    </div>
  );
}
