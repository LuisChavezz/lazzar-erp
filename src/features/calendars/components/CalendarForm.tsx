"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { CalendarDaysIcon } from "@/src/components/Icons";
import { Calendar } from "../interfaces/calendar.interface";
import { TIPO_OPTIONS } from "../constants/tipoCalendario";
import { useCalendarForm } from "../hooks/useCalendarForm";

interface CalendarFormProps {
  onSuccess: () => void;
  calendarToEdit?: Calendar | null;
}

export default function CalendarForm({ onSuccess, calendarToEdit }: CalendarFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    shifts,
    isLoadingShifts,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useCalendarForm({
    onSuccess,
    calendarToEdit,
  });

  // `turno` es obligatorio y su única fuente es el catálogo de turnos: sin
  // turnos el select no ofrece nada y "El turno es requerido" sonaría a
  // descuido del usuario en vez de a un catálogo vacío.
  const hasNoShifts = !isLoadingShifts && shifts.length === 0;

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <CalendarDaysIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Día de Calendario
              </h3>
              <p className="text-xs text-slate-500">Fecha, tipo de día y turno al que aplica</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field">
                <form.Field name="fecha">
                  {(field) => (
                    <FormInput
                      label="Fecha"
                      type="date"
                      className="dark:scheme-dark"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("fecha");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("fecha", field.state.value);
                      }}
                      error={getError("fecha")}
                    />
                  )}
                </form.Field>
              </div>

              {/* `tipo` es opcional: la opción vacía NO va `disabled`. */}
              <div className="group/field">
                <form.Field name="tipo">
                  {(field) => (
                    <FormSelect
                      label="Tipo de Día"
                      name={field.name}
                      value={field.state.value}
                      options={TIPO_OPTIONS}
                      onChange={(event) => {
                        field.handleChange(event.target.value as typeof field.state.value);
                        clearFieldErrors("tipo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("tipo", field.state.value);
                      }}
                      error={getError("tipo")}
                    />
                  )}
                </form.Field>
              </div>

              {/*
                `turno` es OBLIGATORIO —a diferencia del turno opcional del
                empleado— y además es por donde el backend resuelve la empresa,
                así que el formulario no captura `empresa` en ninguna parte.
              */}
              <div className="group/field md:col-span-2">
                <form.Field name="turno">
                  {(field) => (
                    <FormSelect
                      label="Turno"
                      name={field.name}
                      value={String(field.state.value)}
                      onChange={(event) => {
                        field.handleChange(Number(event.target.value));
                        clearFieldErrors("turno");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("turno", field.state.value);
                      }}
                      error={getError("turno")}
                    >
                      <option value="0" disabled>
                        {isLoadingShifts
                          ? "Cargando turnos..."
                          : hasNoShifts
                            ? "No hay turnos registrados"
                            : "Seleccionar..."}
                      </option>
                      {shifts.map((shift) => (
                        <option
                          key={shift.id}
                          value={shift.id}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {shift.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
                {hasNoShifts && (
                  <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                    No hay turnos registrados. Da de alta uno en Capital Humano → Turnos antes
                    de capturar días de calendario.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {calendarToEdit ? "Actualizar Día" : "Registrar Día"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
