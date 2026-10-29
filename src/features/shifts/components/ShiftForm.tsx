"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { Shift } from "../interfaces/shift.interface";
import {
  DIA_LABORAL_OPTIONS,
  isUnparsedDiasLaborales,
  parseDiasLaborales,
} from "../constants/diasLaborales";
import { useShiftForm } from "../hooks/useShiftForm";

interface ShiftFormProps {
  onSuccess: () => void;
  shiftToEdit?: Shift | null;
}

/** Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`). */
export default function ShiftForm({ onSuccess, shiftToEdit }: ShiftFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    getError,
    clearFieldErrors,
    revalidateHoraRange,
    validateField,
    toggleDiaLaboral,
    handleReset,
    handleFormSubmit,
  } = useShiftForm({
    onSuccess,
    shiftToEdit,
  });

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <div className="group/field md:col-span-2">
            <form.Field name="nombre">
              {(field) => (
                <FormInput
                  label="Nombre del Turno"
                  placeholder="Ej. Matutino"
                  forceUppercase
                  className={COMPACT_FIELD_CLS}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("nombre");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("nombre", field.state.value);
                  }}
                  error={getError("nombre")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="hora_entrada">
              {(field) => (
                <FormInput
                  label="Hora de Entrada"
                  type="time"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark cursor-pointer`}
                  onClick={(event) => {
                    try {
                      event.currentTarget.showPicker?.();
                    } catch {
                      /* noop */
                    }
                  }}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("hora_entrada");
                    // El error de la regla cruzada vive bajo `hora_salida`:
                    // si este cambio la satisface (o la vuelve a romper),
                    // hay que reflejarlo ahí.
                    revalidateHoraRange(
                      event.target.value,
                      form.getFieldValue("hora_salida")
                    );
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("hora_entrada", field.state.value);
                  }}
                  error={getError("hora_entrada")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="hora_salida">
              {(field) => (
                <FormInput
                  label="Hora de Salida"
                  type="time"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark cursor-pointer`}
                  onClick={(event) => {
                    try {
                      event.currentTarget.showPicker?.();
                    } catch {
                      /* noop */
                    }
                  }}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("hora_salida");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("hora_salida", field.state.value);
                  }}
                  error={getError("hora_salida")}
                />
              )}
            </form.Field>
            <p className="mt-1 ml-1 text-[11px] text-slate-400">
              La salida debe ser posterior a la entrada: el turno no puede cruzar la
              medianoche.
            </p>
          </div>

          {/*
            Selector de días. El valor del formulario es la CADENA que se
            guarda, no un arreglo: así un valor heredado que el selector no
            sabe leer sobrevive intacto mientras nadie toque una casilla.
          */}
          <div className="group/field md:col-span-2">
            <form.Field name="dias_laborales">
              {(field) => {
                const selected = parseDiasLaborales(field.state.value);
                const hasUnparsedValue = isUnparsedDiasLaborales(field.state.value);
                const error = getError("dias_laborales");

                return (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">
                      Días Laborales
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DIA_LABORAL_OPTIONS.map((option) => {
                        const isChecked = selected.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
                              isChecked
                                ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400"
                                : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="accent-sky-500"
                              checked={isChecked}
                              onChange={(event) => {
                                field.handleChange(
                                  toggleDiaLaboral(
                                    selected,
                                    option.value,
                                    event.target.checked
                                  )
                                );
                                clearFieldErrors("dias_laborales");
                              }}
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                    {hasUnparsedValue && (
                      <p className="mt-2 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                        El valor guardado (&quot;{field.state.value}&quot;) no usa los códigos
                        de día. Se conservará tal cual hasta que marques una casilla.
                      </p>
                    )}
                    {error && (
                      <p className="mt-1 ml-1 text-[11px] text-red-500">{error.message}</p>
                    )}
                  </div>
                );
              }}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="tolerancia_retardo_minutos">
              {(field) => (
                <FormInput
                  label="Tolerancia de Retardo (minutos)"
                  type="number"
                  min="0"
                  placeholder="5"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value === 0 ? "" : field.state.value}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.handleChange(value === "" ? 0 : Number(value));
                    clearFieldErrors("tolerancia_retardo_minutos");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("tolerancia_retardo_minutos", field.state.value);
                  }}
                  error={getError("tolerancia_retardo_minutos")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="horas_base_diarias">
              {(field) => (
                <FormInput
                  label="Horas Base Diarias"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="8.00"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("horas_base_diarias");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("horas_base_diarias", field.state.value);
                  }}
                  error={getError("horas_base_diarias")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field md:col-span-2">
            <form.Field name="descripcion">
              {(field) => (
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Descripción"
                  rows={2}
                  placeholder="Describe el turno (opcional)"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("descripcion");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("descripcion", field.state.value);
                  }}
                  error={getError("descripcion")}
                />
              )}
            </form.Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {shiftToEdit ? "Actualizar Turno" : "Registrar Turno"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
