"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormToggle } from "@/src/components/FormToggle";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { AbsenceIcon } from "@/src/components/Icons";
import { Absence } from "../interfaces/absence.interface";
import {
  isGoceForzado,
  TIPO_AUSENCIA_OPTIONS,
  TIPO_FALTA_INJUSTIFICADA,
  type TipoAusencia,
} from "../constants/absenceChoices";
import { useAbsenceForm } from "../hooks/useAbsenceForm";

interface AbsenceFormProps {
  onSuccess: () => void;
  absenceToEdit?: Absence | null;
}

const GOCE_HINT: Record<TipoAusencia, string> = {
  permiso: "Sugerido: con goce de sueldo. Puedes cambiarlo.",
  incapacidad: "Sugerido: sin goce de sueldo. Puedes cambiarlo.",
  falta_injustificada: "Una falta injustificada siempre es sin goce de sueldo.",
};

export default function AbsenceForm({ onSuccess, absenceToEdit }: AbsenceFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    empleadoOptions,
    isLoadingEmployees,
    isErrorEmployees,
    getError,
    changeRuleInput,
    changeTipo,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useAbsenceForm({ onSuccess, absenceToEdit });

  // Un catálogo caído NO se pinta como catálogo vacío. Mismo criterio que
  // vacaciones.
  const hasNoEmployees =
    !isLoadingEmployees && !isErrorEmployees && empleadoOptions.length === 0;

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
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
              <AbsenceIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Permiso o ausencia
              </h3>
              <p className="text-xs text-slate-500">Empleado, tipo, periodo, goce de sueldo y motivo</p>
            </div>
          </div>

          <div className="p-8">
            <form.Subscribe selector={(state) => state.values.tipo}>
              {(tipo) => {
                const isFalta = tipo === TIPO_FALTA_INJUSTIFICADA;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="group/field">
                      <form.Field name="empleado">
                        {(field) => (
                          <FormSelect
                            label="Empleado"
                            name={field.name}
                            value={String(field.state.value)}
                            onChange={(event) =>
                              changeRuleInput("empleado", Number(event.target.value))
                            }
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
                          No se pudo cargar el catálogo de empleados. Revisa tu conexión e intenta
                          abrir el diálogo de nuevo.
                        </p>
                      )}
                      {hasNoEmployees && (
                        <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                          No hay empleados activos. Da de alta uno en Capital Humano → Empleados
                          antes de registrar ausencias.
                        </p>
                      )}
                    </div>

                    {/* Sin opción vacía: `tipo` siempre viaja. */}
                    <div className="group/field">
                      <form.Field name="tipo">
                        {(field) => (
                          <FormSelect
                            label="Tipo"
                            name={field.name}
                            value={field.state.value}
                            options={TIPO_AUSENCIA_OPTIONS}
                            onChange={(event) => changeTipo(event.target.value as TipoAusencia)}
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
                      <form.Field name="fecha_inicio">
                        {(field) => (
                          <FormInput
                            label="Fecha de inicio"
                            type="date"
                            className="dark:scheme-dark"
                            name={field.name}
                            value={field.state.value}
                            onChange={(event) => changeRuleInput("fecha_inicio", event.target.value)}
                            onBlur={() => {
                              field.handleBlur();
                              validateField("fecha_inicio", field.state.value);
                            }}
                            error={getError("fecha_inicio")}
                          />
                        )}
                      </form.Field>
                    </div>

                    {/* Lleva el orden de fechas, la falta futura y el traslape. */}
                    <div className="group/field">
                      <form.Field name="fecha_fin">
                        {(field) => (
                          <FormInput
                            label="Fecha de fin"
                            type="date"
                            className="dark:scheme-dark"
                            name={field.name}
                            value={field.state.value}
                            onChange={(event) => changeRuleInput("fecha_fin", event.target.value)}
                            onBlur={() => {
                              field.handleBlur();
                              validateField("fecha_fin", field.state.value);
                            }}
                            error={getError("fecha_fin")}
                          />
                        )}
                      </form.Field>
                      {isFalta && (
                        <p className="mt-1 ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                          Solo faltas ya ocurridas: la fecha de fin no puede ser posterior a hoy.
                        </p>
                      )}
                    </div>

                    {/*
                      Falta injustificada: forzado a "sin goce" y bloqueado (el
                      payload también lo fuerza). Los demás tipos sugieren un
                      valor al elegirse y quedan editables.
                    */}
                    <div className="group/field md:col-span-2">
                      <form.Field name="con_goce_sueldo">
                        {(field) => (
                          <FormToggle
                            label="Goce de sueldo"
                            description={
                              isFalta || !field.state.value ? "Sin goce de sueldo" : "Con goce de sueldo"
                            }
                            name={field.name}
                            checked={isFalta ? false : field.state.value}
                            disabled={isGoceForzado(tipo)}
                            onChange={(event) => {
                              field.handleChange(event.target.checked);
                              clearFieldErrors("con_goce_sueldo");
                            }}
                            error={getError("con_goce_sueldo")}
                          />
                        )}
                      </form.Field>
                      <p className="mt-1 ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {GOCE_HINT[tipo]}
                      </p>
                    </div>

                    <div className="group/field md:col-span-2">
                      <form.Field name="motivo">
                        {(field) => (
                          <FormTextarea
                            label="Motivo (opcional)"
                            rows={3}
                            placeholder="Motivo o comentarios"
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
                );
              }}
            </form.Subscribe>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {absenceToEdit ? "Actualizar Registro" : "Registrar Ausencia"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
