"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { Calendar } from "../interfaces/calendar.interface";
import { TIPO_OPTIONS } from "../constants/tipoCalendario";
import { useCalendarForm } from "../hooks/useCalendarForm";

interface CalendarFormProps {
  onSuccess: () => void;
  calendarToEdit?: Calendar | null;
}

/** Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`). */
export default function CalendarForm({ onSuccess, calendarToEdit }: CalendarFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    shifts,
    isLoadingShifts,
    isErrorShifts,
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
  //
  // Un catálogo caído NO se pinta como catálogo vacío (mismo criterio que
  // `ContractForm`): si la petición falló, `shifts` también queda en `[]`, y
  // decir "da de alta uno" mandaría a crear turnos que ya existen. De ahí que
  // "vacío" exija una carga EXITOSA.
  const hasNoShifts = !isLoadingShifts && !isErrorShifts && shifts.length === 0;

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <div className="group/field">
            <form.Field name="fecha">
              {(field) => (
                <FormInput
                  label="Fecha"
                  type="date"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
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
                  className={COMPACT_FIELD_CLS}
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
                  className={COMPACT_FIELD_CLS}
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
                      : isErrorShifts
                        ? "No se pudo cargar el catálogo de turnos"
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
            {isErrorShifts && (
              <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                No se pudo cargar el catálogo de turnos. Revisa tu conexión e intenta abrir
                el diálogo de nuevo.
              </p>
            )}
            {hasNoShifts && (
              <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                No hay turnos registrados. Da de alta uno en Capital Humano → Turnos antes
                de capturar días de calendario.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {calendarToEdit ? "Actualizar Día" : "Registrar Día"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
