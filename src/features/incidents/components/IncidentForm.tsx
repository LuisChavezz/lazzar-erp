"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { IncidentIcon } from "@/src/components/Icons";
import { Incident } from "../interfaces/incident.interface";
import {
  ESTADO_INCIDENCIA_OPTIONS,
  ESTADO_QUE_EXIGE_ACCIONES,
  GRAVEDAD_INCIDENCIA_OPTIONS,
  TIPO_INCIDENCIA_OPTIONS,
} from "../constants/incidentChoices";
import { useIncidentForm } from "../hooks/useIncidentForm";

interface IncidentFormProps {
  onSuccess: () => void;
  incidentToEdit?: Incident | null;
}

export default function IncidentForm({ onSuccess, incidentToEdit }: IncidentFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    employeeOptions,
    isLoadingEmployees,
    isErrorEmployees,
    getError,
    clearFieldErrors,
    revalidateAccionesTomadas,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useIncidentForm({
    onSuccess,
    incidentToEdit,
  });

  // Un catálogo caído NO se pinta como catálogo vacío: si la petición falló,
  // `employees` también queda en `[]`, y decir "da de alta uno" mandaría a
  // crear empleados que ya existen. De ahí que "vacío" exija una carga
  // EXITOSA. Mismo criterio que capacitaciones.
  const hasNoEmployees =
    !isLoadingEmployees && !isErrorEmployees && employeeOptions.length === 0;

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <IncidentIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Incidencia
              </h3>
              <p className="text-xs text-slate-500">
                Empleado, tipo, gravedad, fecha, estado y seguimiento
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/*
                `empleado` es OBLIGATORIO y además es por donde el backend
                resuelve la empresa, así que el formulario no captura `empresa`
                en ninguna parte.
              */}
              <div className="group/field md:col-span-2">
                <form.Field name="empleado">
                  {(field) => (
                    <FormSelect
                      label="Empleado"
                      name={field.name}
                      value={String(field.state.value)}
                      onChange={(event) => {
                        field.handleChange(Number(event.target.value));
                        clearFieldErrors("empleado");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("empleado", field.state.value);
                      }}
                      error={getError("empleado")}
                    >
                      <option value="0" disabled>
                        {isLoadingEmployees
                          ? "Cargando empleados..."
                          : isErrorEmployees
                            ? "No se pudo cargar el catálogo de empleados"
                            : hasNoEmployees
                              ? "No hay empleados activos"
                              : "Seleccionar..."}
                      </option>
                      {employeeOptions.map((employee) => (
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
                    No se pudo cargar el catálogo de empleados. Revisa tu conexión e intenta
                    abrir el diálogo de nuevo.
                  </p>
                )}
                {hasNoEmployees && (
                  <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                    No hay empleados activos. Da de alta uno en Capital Humano → Empleados antes
                    de registrar incidencias.
                  </p>
                )}
              </div>

              {/* `tipo`, `gravedad` y `estado` siempre viajan: sin opción vacía. */}
              <div className="group/field">
                <form.Field name="tipo">
                  {(field) => (
                    <FormSelect
                      label="Tipo"
                      name={field.name}
                      value={field.state.value}
                      options={TIPO_INCIDENCIA_OPTIONS}
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

              <div className="group/field">
                <form.Field name="gravedad">
                  {(field) => (
                    <FormSelect
                      label="Gravedad"
                      name={field.name}
                      value={field.state.value}
                      options={GRAVEDAD_INCIDENCIA_OPTIONS}
                      onChange={(event) => {
                        field.handleChange(event.target.value as typeof field.state.value);
                        clearFieldErrors("gravedad");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("gravedad", field.state.value);
                      }}
                      error={getError("gravedad")}
                    />
                  )}
                </form.Field>
              </div>

              {/*
                Sin `max` nativo: el tope "hasta hoy" lo valida el schema; un
                `max` haría que el navegador bloqueara el submit con su propio
                globo antes del mensaje.
              */}
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

              <div className="group/field">
                <form.Field name="estado">
                  {(field) => (
                    <FormSelect
                      label="Estado"
                      name={field.name}
                      value={field.state.value}
                      options={ESTADO_INCIDENCIA_OPTIONS}
                      onChange={(event) => {
                        const nextEstado = event.target.value as typeof field.state.value;
                        field.handleChange(nextEstado);
                        clearFieldErrors("estado");
                        // `estado` es el otro campo de la regla de
                        // `acciones_tomadas`.
                        revalidateAccionesTomadas(nextEstado);
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("estado", field.state.value);
                      }}
                      error={getError("estado")}
                    />
                  )}
                </form.Field>
              </div>

              {/* Opcional pero NO nullable: vacío viaja como "". */}
              <div className="group/field md:col-span-2">
                <form.Field name="descripcion">
                  {(field) => (
                    <FormTextarea
                      label="Descripción (opcional)"
                      rows={3}
                      placeholder="Qué ocurrió"
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

              {/*
                Obligatoria solo con estado "Cerrado"; nunca se deshabilita ni
                se vacía al reabrir. La etiqueta sigue al estado para que la
                exigencia se vea antes de enviar.
              */}
              <form.Subscribe selector={(state) => state.values.estado}>
                {(estado) => (
                  <div className="group/field md:col-span-2">
                    <form.Field name="acciones_tomadas">
                      {(field) => (
                        <FormTextarea
                          label={
                            estado === ESTADO_QUE_EXIGE_ACCIONES
                              ? "Acciones Tomadas"
                              : "Acciones Tomadas (opcional)"
                          }
                          rows={3}
                          placeholder="Qué se hizo al respecto"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldErrors("acciones_tomadas");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("acciones_tomadas", field.state.value);
                          }}
                          error={getError("acciones_tomadas")}
                        />
                      )}
                    </form.Field>
                  </div>
                )}
              </form.Subscribe>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {incidentToEdit ? "Actualizar Incidencia" : "Registrar Incidencia"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
