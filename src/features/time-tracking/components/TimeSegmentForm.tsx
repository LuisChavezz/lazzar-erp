"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { SectionTitle } from "@/src/components/DetailDialogPrimitives";
import { openPicker } from "@/src/features/attendance/utils/dateInputs";
import type { ProductionOrderListItem } from "@/src/features/production-orders/interfaces/production-order.interface";
import {
  TIPO_CONTROL_HORAS_OPTIONS,
  TIPO_CONTROL_HORAS_VALUES,
  type TipoControlHoras,
} from "../constants/timeTrackingChoices";
import type { TimeSegment } from "../interfaces/time-tracking.interface";
import { useTimeSegmentForm, type BreakdownAttendance } from "../hooks/useTimeSegmentForm";
import { buildOpOptions } from "../utils/productionOrderOptions";

interface TimeSegmentFormProps {
  attendance: BreakdownAttendance;
  bounds: { entryMs: number; exitMs: number | null };
  segments: readonly TimeSegment[];
  cutoffMs: number | null;
  /** Tramo a editar, o `null` para dar de alta. El padre lo monta con `key` por modo y tramo. */
  segment: TimeSegment | null;
  orders: readonly ProductionOrderListItem[];
  ordersLoaded: boolean;
  ordersError: boolean;
  /** Otra escritura de tramos en vuelo: el formulario espera a que termine. */
  disabled: boolean;
  onDone: () => void;
  /** Solo al editar: vuelve al alta sin guardar. */
  onCancel?: () => void;
}

const isTipo = (value: string): value is TipoControlHoras =>
  (TIPO_CONTROL_HORAS_VALUES as readonly string[]).includes(value);

/**
 * Alta o edición de un tramo dentro del desglose. La lógica (límites,
 * traslapes, sugerencia de tipo, cuerpo a enviar) vive en
 * `useTimeSegmentForm`; aquí solo se pinta. `descripcion` va sin
 * `forceUppercase`, como el resto de los textos libres de RH.
 */
export function TimeSegmentForm({
  attendance,
  bounds,
  segments,
  cutoffMs,
  segment,
  orders,
  ordersLoaded,
  ordersError,
  disabled,
  onDone,
  onCancel,
}: TimeSegmentFormProps) {
  const {
    form,
    isEditing,
    isPending,
    formMessage,
    storedOpId,
    getError,
    clearFieldErrors,
    changeTime,
    changeTipo,
    validateField,
    getCutoffWarning,
    handleFormSubmit,
  } = useTimeSegmentForm({ attendance, bounds, segments, cutoffMs, segment, onDone });

  const opOptions = buildOpOptions(orders, storedOpId, ordersLoaded);

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 dark:border-white/10 p-4"
    >
      <SectionTitle>{isEditing ? "Editar tramo" : "Agregar tramo"}</SectionTitle>
      <fieldset disabled={isPending || disabled} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["hora_inicio", "hora_fin"] as const).map((name) => (
            <form.Field key={name} name={name}>
              {(field) => (
                <FormInput
                  label={name === "hora_inicio" ? "Inicio" : "Fin"}
                  type="time"
                  name={field.name}
                  className="dark:scheme-dark cursor-pointer"
                  onClick={openPicker}
                  value={field.state.value}
                  error={getError(name)}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    changeTime(name, event.target.value);
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField(name, form.state.values);
                  }}
                />
              )}
            </form.Field>
          ))}
          <form.Field name="tipo">
            {(field) => (
              <FormSelect
                label="Tipo"
                name={field.name}
                value={field.state.value}
                error={getError("tipo")}
                options={TIPO_CONTROL_HORAS_OPTIONS}
                onChange={(event) => {
                  if (isTipo(event.target.value)) changeTipo(event.target.value);
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
          <form.Field name="op">
            {(field) => (
              <div>
                <FormSelect
                  label="OP"
                  name={field.name}
                  value={field.state.value}
                  error={getError("op")}
                  options={opOptions}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("op");
                  }}
                  onBlur={field.handleBlur}
                />
                {ordersError ? (
                  <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                    No se pudo cargar el catálogo de órdenes de producción.
                  </p>
                ) : (
                  !ordersLoaded && (
                    <p className="mt-1 ml-1 text-[11px] text-slate-400">Cargando órdenes…</p>
                  )
                )}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) => [state.values.hora_inicio, state.values.hora_fin] as const}
        >
          {([hora_inicio, hora_fin]) => {
            const warning = getCutoffWarning({ hora_inicio, hora_fin });
            return warning ? (
              <p className="-mt-1 ml-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                {warning}
              </p>
            ) : null;
          }}
        </form.Subscribe>

        <form.Field name="descripcion">
          {(field) => (
            <FormTextarea
              label="Descripción"
              name={field.name}
              rows={2}
              placeholder="Tarea u observaciones del tramo (opcional)"
              value={field.state.value}
              error={getError("descripcion")}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("descripcion");
              }}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
      </fieldset>

      {formMessage && (
        <p className="ml-1 text-xs font-medium text-amber-600 dark:text-amber-400">{formMessage}</p>
      )}

      <div className="flex justify-end gap-3">
        {isEditing && onCancel && (
          <FormCancelButton label="Cancelar edición" onClick={onCancel} disabled={isPending} />
        )}
        <FormSubmitButton isPending={isPending} loadingLabel="Guardando…" disabled={disabled}>
          {isEditing ? "Guardar cambios" : "Agregar tramo"}
        </FormSubmitButton>
      </div>
    </form>
  );
}
