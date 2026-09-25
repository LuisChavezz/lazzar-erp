"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { EvaluationIcon } from "@/src/components/Icons";
import { Evaluation } from "../interfaces/evaluation.interface";
import {
  ESTADO_COMPLETADA,
  PERIODO_EVALUACION_OPTIONS,
  TIPO_EVALUACION_OPTIONS,
} from "../constants/evaluationChoices";
import { useEvaluationForm } from "../hooks/useEvaluationForm";

interface EvaluationFormProps {
  onSuccess: () => void;
  evaluationToEdit?: Evaluation | null;
}

const PUNTAJE_HINT = "Solo se captura cuando la evaluación está «Completada».";

export default function EvaluationForm({ onSuccess, evaluationToEdit }: EvaluationFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    estadoOptions,
    empleadoOptions,
    evaluadorOptions,
    isLoadingEmployees,
    isErrorEmployees,
    getError,
    clearFieldErrors,
    revalidateCrossRules,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useEvaluationForm({
    onSuccess,
    evaluationToEdit,
  });

  // Un catálogo caído NO se pinta como catálogo vacío: si la petición falló,
  // `employees` también queda en `[]`, y decir "da de alta uno" mandaría a
  // crear empleados que ya existen. De ahí que "vacío" exija una carga
  // EXITOSA. Mismo criterio que incidencias.
  const hasNoEmployees =
    !isLoadingEmployees && !isErrorEmployees && empleadoOptions.length === 0;

  // Texto del placeholder de los dos selectores, que comparten catálogo.
  const catalogPlaceholder = isLoadingEmployees
    ? "Cargando empleados..."
    : isErrorEmployees
      ? "No se pudo cargar el catálogo de empleados"
      : null;

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-sm">
              <EvaluationIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Evaluación
              </h3>
              <p className="text-xs text-slate-500">
                Empleado, evaluador, tipo, periodo, fecha, estado y resultado
              </p>
            </div>
          </div>

          <div className="p-8">
            <form.Subscribe selector={(state) => state.values.estado}>
              {(estado) => {
                const isCompleted = estado === ESTADO_COMPLETADA;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/*
                      `empleado` es OBLIGATORIO y además es por donde el
                      backend resuelve la empresa, así que el formulario no
                      captura `empresa` en ninguna parte.
                    */}
                    <div className="group/field">
                      <form.Field name="empleado">
                        {(field) => (
                          <FormSelect
                            label="Empleado Evaluado"
                            name={field.name}
                            value={String(field.state.value)}
                            onChange={(event) => {
                              const nextEmpleado = Number(event.target.value);
                              field.handleChange(nextEmpleado);
                              clearFieldErrors("empleado");
                              // `empleado` es el otro campo de la regla de
                              // autoevaluación de `evaluador`.
                              revalidateCrossRules({ empleado: nextEmpleado });
                            }}
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
                          No se pudo cargar el catálogo de empleados. Revisa tu conexión e
                          intenta abrir el diálogo de nuevo.
                        </p>
                      )}
                      {hasNoEmployees && (
                        <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                          No hay empleados activos. Da de alta uno en Capital Humano → Empleados
                          antes de registrar evaluaciones.
                        </p>
                      )}
                    </div>

                    {/*
                      Opcional mientras está pendiente ("Sin evaluador" viaja
                      como null) y obligatorio al completar. La autoevaluación
                      la bloquea el schema con su mensaje, no se oculta la
                      opción.
                    */}
                    <div className="group/field">
                      <form.Field name="evaluador">
                        {(field) => (
                          <FormSelect
                            label={isCompleted ? "Evaluador" : "Evaluador (opcional)"}
                            name={field.name}
                            value={String(field.state.value)}
                            onChange={(event) => {
                              field.handleChange(Number(event.target.value));
                              clearFieldErrors("evaluador");
                            }}
                            onBlur={() => {
                              field.handleBlur();
                              validateField("evaluador", field.state.value);
                            }}
                            error={getError("evaluador")}
                          >
                            <option value="0">{catalogPlaceholder ?? "Sin evaluador"}</option>
                            {evaluadorOptions.map((employee) => (
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
                    </div>

                    {/* `tipo`, `periodo` y `estado` siempre viajan: sin opción vacía. */}
                    <div className="group/field">
                      <form.Field name="tipo">
                        {(field) => (
                          <FormSelect
                            label="Tipo"
                            name={field.name}
                            value={field.state.value}
                            options={TIPO_EVALUACION_OPTIONS}
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
                      <form.Field name="periodo">
                        {(field) => (
                          <FormSelect
                            label="Periodo"
                            name={field.name}
                            value={field.state.value}
                            options={PERIODO_EVALUACION_OPTIONS}
                            onChange={(event) => {
                              field.handleChange(event.target.value as typeof field.state.value);
                              clearFieldErrors("periodo");
                            }}
                            onBlur={() => {
                              field.handleBlur();
                              validateField("periodo", field.state.value);
                            }}
                            error={getError("periodo")}
                          />
                        )}
                      </form.Field>
                    </div>

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

                    {/*
                      Al editar una evaluación ya completada, solo se ofrece
                      "Completada": no vuelve a "Pendiente" (ver
                      `estadoOptions`).
                    */}
                    <div className="group/field">
                      <form.Field name="estado">
                        {(field) => (
                          <FormSelect
                            label="Estado"
                            name={field.name}
                            value={field.state.value}
                            options={estadoOptions}
                            onChange={(event) => {
                              const nextEstado = event.target.value as typeof field.state.value;
                              field.handleChange(nextEstado);
                              clearFieldErrors("estado");
                              // `estado` es el otro campo de las reglas de
                              // evaluador y puntaje.
                              revalidateCrossRules({ estado: nextEstado });
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
                      Solo se captura en "Completada". En "Pendiente" se
                      deshabilita pero CONSERVA su valor en el form y viaja como
                      null. Sin `min`/`max` y con `step="any"`: el rango y los
                      decimales los valida el schema, no el navegador.
                    */}
                    <div className="group/field">
                      <form.Field name="puntaje">
                        {(field) => (
                          <FormInput
                            label={isCompleted ? "Puntaje" : "Puntaje (al completar)"}
                            type="number"
                            step="any"
                            placeholder="0 – 100"
                            className="dark:scheme-dark"
                            disabled={!isCompleted}
                            name={field.name}
                            value={field.state.value}
                            onChange={(event) => {
                              field.handleChange(event.target.value);
                              clearFieldErrors("puntaje");
                            }}
                            onBlur={() => {
                              field.handleBlur();
                              validateField("puntaje", field.state.value);
                            }}
                            error={getError("puntaje")}
                          />
                        )}
                      </form.Field>
                      {!isCompleted && (
                        <p className="mt-1 ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {PUNTAJE_HINT}
                        </p>
                      )}
                    </div>

                    <div className="group/field md:col-span-2">
                      <form.Field name="comentarios">
                        {(field) => (
                          <FormTextarea
                            label="Comentarios (opcional)"
                            rows={3}
                            placeholder="Observaciones de la evaluación"
                            name={field.name}
                            value={field.state.value}
                            onChange={(event) => {
                              field.handleChange(event.target.value);
                              clearFieldErrors("comentarios");
                            }}
                            onBlur={() => {
                              field.handleBlur();
                              validateField("comentarios", field.state.value);
                            }}
                            error={getError("comentarios")}
                          />
                        )}
                      </form.Field>
                    </div>
                  </div>
                );
              }}
            </form.Subscribe>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {evaluationToEdit ? "Actualizar Evaluación" : "Registrar Evaluación"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
