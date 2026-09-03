"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ClockIcon } from "@/src/components/Icons";
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

export default function ShiftForm({ onSuccess, shiftToEdit }: ShiftFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    getError,
    clearFieldErrors,
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
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Horario, días laborales y tolerancia</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre del Turno"
                      placeholder="Ej. Matutino"
                      forceUppercase
                      variant="ghost"
                      className="text-3xl font-bold"
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
                      className="dark:scheme-dark cursor-pointer"
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
                      className="dark:scheme-dark cursor-pointer"
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
                      className="dark:scheme-dark"
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
                      className="dark:scheme-dark"
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
                      label="Descripción"
                      rows={3}
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
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {shiftToEdit ? "Actualizar Turno" : "Registrar Turno"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
