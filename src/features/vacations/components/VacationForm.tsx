"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { Vacation } from "../interfaces/vacation.interface";
import type { DiasSuggestion } from "../utils/suggestDiasSolicitados";
import { diasLabel } from "../utils/diasLabel";
import { useVacationForm } from "../hooks/useVacationForm";

interface VacationFormProps {
  onSuccess: () => void;
  vacationToEdit?: Vacation | null;
}

/**
 * Ayuda bajo "Días solicitados": explica de dónde sale la sugerencia o por qué
 * no la hay. `tone` "warn" cuando hay que capturar a mano.
 */
const getDiasHint = (
  suggestion: DiasSuggestion,
  shiftsState: { isLoading: boolean; isError: boolean }
): { text: string; tone: "info" | "warn" } => {
  switch (suggestion.status) {
    case "incomplete":
      return {
        text: "Se sugiere al elegir empleado y fechas, con los días laborales de su turno.",
        tone: "info",
      };
    case "no-shift":
      return {
        text: "El empleado no tiene turno asignado: captura los días a mano.",
        tone: "warn",
      };
    case "shift-unavailable":
      if (shiftsState.isLoading) {
        return { text: "Cargando turnos para sugerir los días...", tone: "info" };
      }
      return {
        text: shiftsState.isError
          ? "No se pudo cargar el catálogo de turnos: captura los días a mano."
          : "El turno del empleado no está disponible: captura los días a mano.",
        tone: "warn",
      };
    case "unparsed-shift":
      return {
        text: `El turno «${suggestion.shift.nombre}» no tiene días laborales reconocibles: captura los días a mano.`,
        tone: "warn",
      };
    case "ok":
      return suggestion.dias === 0
        ? {
            text: `El periodo no incluye días laborales del turno «${suggestion.shift.nombre}» (${suggestion.diasLaborales.join(",")}).`,
            tone: "warn",
          }
        : {
            text: `Sugerido: ${diasLabel(suggestion.dias, { laborales: true })} según el turno «${suggestion.shift.nombre}» (${suggestion.diasLaborales.join(",")}). Los festivos no se descuentan; ajústalo si hace falta.`,
            tone: "info",
          };
  }
};

/** Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`). */
export default function VacationForm({ onSuccess, vacationToEdit }: VacationFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    empleadoOptions,
    isLoadingEmployees,
    isErrorEmployees,
    isLoadingShifts,
    isErrorShifts,
    getError,
    getDiasSuggestion,
    changeDiasInput,
    markDiasManual,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useVacationForm({
    onSuccess,
    vacationToEdit,
  });

  // Un catálogo caído NO se pinta como catálogo vacío: "vacío" exige una carga
  // EXITOSA. Mismo criterio que evaluaciones.
  const hasNoEmployees =
    !isLoadingEmployees && !isErrorEmployees && empleadoOptions.length === 0;

  const catalogPlaceholder = isLoadingEmployees
    ? "Cargando empleados..."
    : isErrorEmployees
      ? "No se pudo cargar el catálogo de empleados"
      : null;

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          {/*
            `empleado` es OBLIGATORIO y es por donde el backend resuelve la
            empresa. Cambiarlo recalcula los días (otro turno) y reevalúa
            el traslape (otro calendario).
          */}
          <div className="group/field md:col-span-2">
            <form.Field name="empleado">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Empleado"
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={(event) => changeDiasInput("empleado", Number(event.target.value))}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("empleado", field.state.value);
                  }}
                  error={getError("empleado")}
                >
                  <option value="0" disabled>
                    {catalogPlaceholder ??
                      (hasNoEmployees ? "No hay empleados activos" : "Seleccionar...")}
                  </option>
                  {empleadoOptions.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {employee.label}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>
            {isErrorEmployees && (
              <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                No se pudo cargar el catálogo de empleados. Revisa tu conexión e intenta abrir
                el diálogo de nuevo.
              </p>
            )}
            {hasNoEmployees && (
              <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                No hay empleados activos. Da de alta uno en Capital Humano → Empleados antes de
                registrar vacaciones.
              </p>
            )}
          </div>

          <div className="group/field">
            <form.Field name="fecha_inicio">
              {(field) => (
                <FormInput
                  label="Fecha de inicio"
                  type="date"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => changeDiasInput("fecha_inicio", event.target.value)}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_inicio", field.state.value);
                  }}
                  error={getError("fecha_inicio")}
                />
              )}
            </form.Field>
          </div>

          {/* Lleva el orden de fechas y el traslape (ver el schema). */}
          <div className="group/field">
            <form.Field name="fecha_fin">
              {(field) => (
                <FormInput
                  label="Fecha de fin"
                  type="date"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => changeDiasInput("fecha_fin", event.target.value)}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_fin", field.state.value);
                  }}
                  error={getError("fecha_fin")}
                />
              )}
            </form.Field>
          </div>

          {/*
            Prellenado con la sugerencia y editable. Sin `min`/`max` y con
            `step="any"`: el entero y el tope los valida el schema, no el
            navegador.
          */}
          <div className="group/field md:col-span-2">
            <form.Field name="dias_solicitados">
              {(field) => (
                <FormInput
                  label="Días solicitados"
                  type="number"
                  step="any"
                  inputMode="numeric"
                  placeholder="Días hábiles del periodo"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    markDiasManual();
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("dias_solicitados", field.state.value);
                  }}
                  error={getError("dias_solicitados")}
                />
              )}
            </form.Field>
            <form.Subscribe
              selector={(state) => ({
                empleado: state.values.empleado,
                fecha_inicio: state.values.fecha_inicio,
                fecha_fin: state.values.fecha_fin,
              })}
            >
              {(values) => {
                const hint = getDiasHint(getDiasSuggestion(values), {
                  isLoading: isLoadingShifts,
                  isError: isErrorShifts,
                });
                return (
                  <p
                    className={`mt-1 ml-1 text-[11px] ${
                      hint.tone === "warn"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {hint.text}
                  </p>
                );
              }}
            </form.Subscribe>
          </div>

          <div className="group/field md:col-span-2">
            <form.Field name="motivo">
              {(field) => (
                <FormTextarea
                  label="Motivo (opcional)"
                  rows={3}
                  placeholder="Motivo o comentarios de la solicitud"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("motivo");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("motivo", field.state.value);
                  }}
                  error={getError("motivo")}
                />
              )}
            </form.Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {vacationToEdit ? "Actualizar Solicitud" : "Registrar Solicitud"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
