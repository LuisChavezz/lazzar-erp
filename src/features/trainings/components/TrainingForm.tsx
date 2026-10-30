"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { Training } from "../interfaces/training.interface";
import {
  ESTADO_CAPACITACION_OPTIONS,
  ESTADO_CON_RESULTADO,
} from "../constants/trainingChoices";
import { useTrainingForm } from "../hooks/useTrainingForm";

interface TrainingFormProps {
  onSuccess: () => void;
  trainingToEdit?: Training | null;
}

const RESULTADO_HINT = "Solo disponible cuando el estado es «Finalizado».";

/** Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`). */
export default function TrainingForm({ onSuccess, trainingToEdit }: TrainingFormProps) {
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
    revalidateFechaRange,
    revalidateResultadoFields,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useTrainingForm({
    onSuccess,
    trainingToEdit,
  });

  // Un catálogo caído NO se pinta como catálogo vacío: si la petición falló,
  // `employees` también queda en `[]`, y decir "da de alta uno" mandaría a
  // crear empleados que ya existen. De ahí que "vacío" exija una carga
  // EXITOSA. Mismo criterio que contratos.
  const hasNoEmployees =
    !isLoadingEmployees && !isErrorEmployees && employeeOptions.length === 0;

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          {/*
            `empleado` es OBLIGATORIO y además es por donde el backend
            resuelve la empresa, así que el formulario no captura `empresa`
            en ninguna parte.
          */}
          <div className="group/field md:col-span-2">
            <form.Field name="empleado">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
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
                de registrar capacitaciones.
              </p>
            )}
          </div>

          <div className="group/field">
            <form.Field name="nombre">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Nombre de la Capacitación"
                  placeholder="Ej. SEGURIDAD INDUSTRIAL"
                  maxLength={255}
                  forceUppercase
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

          {/* Opcional pero NO nullable: vacío viaja como "". */}
          <div className="group/field">
            <form.Field name="institucion">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Institución (opcional)"
                  placeholder="Quién imparte la capacitación"
                  maxLength={255}
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("institucion");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("institucion", field.state.value);
                  }}
                  error={getError("institucion")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="fecha_inicio">
              {(field) => (
                <FormInput
                  label="Fecha de Inicio"
                  type="date"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("fecha_inicio");
                    // El error de la regla cruzada vive bajo `fecha_fin`:
                    // si este cambio la satisface, hay que quitarlo de ahí.
                    revalidateFechaRange(
                      event.target.value,
                      form.getFieldValue("fecha_fin")
                    );
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_inicio", field.state.value);
                  }}
                  error={getError("fecha_inicio")}
                />
              )}
            </form.Field>
          </div>

          {/* Opcional: vacío viaja como null. */}
          <div className="group/field">
            <form.Field name="fecha_fin">
              {(field) => (
                <FormInput
                  label="Fecha de Fin (opcional)"
                  type="date"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("fecha_fin");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_fin", field.state.value);
                  }}
                  error={getError("fecha_fin")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="horas">
              {(field) => (
                <FormInput
                  label="Horas (opcional)"
                  type="number"
                  // Sin `min` y con `step="any"` (sin `step` el default es 1
                  // y 1.5 fallaría igual): la validación nativa bloquearía
                  // el submit con su propio globo antes del mensaje del
                  // schema, que es quien valida el entero positivo.
                  step="any"
                  placeholder="0"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("horas");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("horas", field.state.value);
                  }}
                  error={getError("horas")}
                />
              )}
            </form.Field>
          </div>

          {/* `estado` siempre viaja: sin opción vacía. */}
          <div className="group/field">
            <form.Field name="estado">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Estado"
                  name={field.name}
                  value={field.state.value}
                  options={ESTADO_CAPACITACION_OPTIONS}
                  onChange={(event) => {
                    const nextEstado = event.target.value as typeof field.state.value;
                    field.handleChange(nextEstado);
                    clearFieldErrors("estado");
                    // `estado` es el otro campo de las reglas de
                    // calificación y constancia.
                    revalidateResultadoFields(nextEstado);
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

          {/*
            Calificación y constancia solo se capturan en "Finalizado". En
            otro estado se deshabilitan pero CONSERVAN su valor en el form
            (un cambio de estado accidental no los borra) y viajan como null.
          */}
          <form.Subscribe selector={(state) => state.values.estado}>
            {(estado) => {
              const hasResultado = estado === ESTADO_CON_RESULTADO;

              return (
                <>
                  <div className="group/field">
                    <form.Field name="calificacion">
                      {(field) => (
                        <FormInput
                          label="Calificación (opcional)"
                          type="number"
                          // Sin `min`/`max` y con `step="any"`, igual que
                          // horas: el rango y los decimales los valida el
                          // schema.
                          step="any"
                          placeholder="0 – 100"
                          className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                          disabled={!hasResultado}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldErrors("calificacion");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("calificacion", field.state.value);
                          }}
                          error={getError("calificacion")}
                        />
                      )}
                    </form.Field>
                    {!hasResultado && (
                      <p className="mt-1 ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {RESULTADO_HINT}
                      </p>
                    )}
                  </div>

                  {/* Texto libre en el backend; aquí se exige URL http(s). */}
                  <div className="group/field">
                    <form.Field name="constancia_url">
                      {(field) => (
                        <FormInput
                          className={COMPACT_FIELD_CLS}
                          label="Constancia (URL, opcional)"
                          // Texto y no `type="url"`: la validación nativa
                          // bloquearía el submit con su propio globo antes
                          // del mensaje del schema.
                          inputMode="url"
                          placeholder="https://..."
                          maxLength={255}
                          disabled={!hasResultado}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldErrors("constancia_url");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("constancia_url", field.state.value);
                          }}
                          error={getError("constancia_url")}
                        />
                      )}
                    </form.Field>
                    {!hasResultado && (
                      <p className="mt-1 ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {RESULTADO_HINT}
                      </p>
                    )}
                  </div>
                </>
              );
            }}
          </form.Subscribe>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {trainingToEdit ? "Actualizar Capacitación" : "Registrar Capacitación"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
