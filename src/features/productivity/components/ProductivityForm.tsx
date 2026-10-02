"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ProductivityIcon } from "@/src/components/Icons";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { Productivity } from "../interfaces/productivity.interface";
import { useProductivityForm } from "../hooks/useProductivityForm";

interface ProductivityFormProps {
  onSuccess: () => void;
  recordToEdit?: Productivity | null;
}

const OPTION_CLASS = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

export default function ProductivityForm({ onSuccess, recordToEdit }: ProductivityFormProps) {
  const {
    form,
    formRef,
    isPending,
    empleadoOptions,
    unidadOptions,
    departamentoLabel,
    isLoadingEmployees,
    isErrorEmployees,
    isLoadingUnits,
    isErrorUnits,
    getError,
    changeEmpleado,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useProductivityForm({ onSuccess, recordToEdit });

  // Un catálogo caído NO se pinta como catálogo vacío: "vacío" exige una carga
  // EXITOSA. Mismo criterio que evaluaciones.
  const hasNoEmployees =
    !isLoadingEmployees && !isErrorEmployees && empleadoOptions.length === 0;
  const hasNoUnits = !isLoadingUnits && !isErrorUnits && unidadOptions.length === 0;

  const empleadoPlaceholder = isLoadingEmployees
    ? "Cargando empleados..."
    : isErrorEmployees
      ? "No se pudo cargar el catálogo de empleados"
      : hasNoEmployees
        ? "No hay empleados activos"
        : "Seleccionar...";

  const unidadPlaceholder = isLoadingUnits
    ? "Cargando unidades..."
    : isErrorUnits
      ? "No se pudo cargar el catálogo de unidades"
      : hasNoUnits
        ? "No hay unidades de medida activas"
        : "Seleccionar...";

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-sm">
              <ProductivityIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Productividad
              </h3>
              <p className="text-xs text-slate-500">
                Empleado, fecha, meta, resultado y unidad de medida
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/*
                `empleado` define también `empresa` y `departamento`: ninguno
                de los dos se captura (ver `useProductivityForm`).
              */}
              <div className="group/field">
                <form.Field name="empleado">
                  {(field) => (
                    <FormSelect
                      label="Empleado"
                      name={field.name}
                      value={String(field.state.value)}
                      onChange={(event) => changeEmpleado(Number(event.target.value))}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("empleado", field.state.value);
                      }}
                      error={getError("empleado")}
                    >
                      <option value="0" disabled>
                        {empleadoPlaceholder}
                      </option>
                      {empleadoOptions.map((employee) => (
                        <option key={employee.id} value={employee.id} className={OPTION_CLASS}>
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
                    de registrar productividad.
                  </p>
                )}
              </div>

              {/* Solo lectura: se deriva del empleado, nunca se elige. */}
              <div className="group/field">
                <FormInput
                  label="Departamento"
                  name="departamento"
                  value={departamentoLabel}
                  readOnly
                  disabled
                />
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

              <div className="group/field">
                <form.Field name="meta_unidad">
                  {(field) => (
                    <FormSelect
                      label="Unidad de medida"
                      name={field.name}
                      value={String(field.state.value)}
                      onChange={(event) => {
                        field.handleChange(Number(event.target.value));
                        clearFieldErrors("meta_unidad");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("meta_unidad", field.state.value);
                      }}
                      error={getError("meta_unidad")}
                    >
                      <option value="0" disabled>
                        {unidadPlaceholder}
                      </option>
                      {unidadOptions.map((unit) => (
                        <option key={unit.id} value={unit.id} className={OPTION_CLASS}>
                          {unit.label}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              {/*
                Texto con saneado de decimales (no `type="number"`): solo
                dígitos y un punto, hasta 2 decimales. El tope de enteros lo
                valida el schema.
              */}
              <div className="group/field">
                <form.Field name="meta">
                  {(field) => (
                    <FormInput
                      label="Meta (opcional)"
                      inputMode="decimal"
                      placeholder="0.00"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                        clearFieldErrors("meta");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("meta", field.state.value);
                      }}
                      error={getError("meta")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="resultado">
                  {(field) => (
                    <FormInput
                      label="Resultado (opcional)"
                      inputMode="decimal"
                      placeholder="0.00"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                        clearFieldErrors("resultado");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("resultado", field.state.value);
                      }}
                      error={getError("resultado")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field md:col-span-2">
                <form.Field name="descripcion">
                  {(field) => (
                    <FormTextarea
                      label="Descripción (opcional)"
                      rows={3}
                      forceUppercase
                      placeholder="Actividad medida (p. ej. piezas cosidas)"
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
            {recordToEdit ? "Actualizar Registro" : "Registrar Productividad"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
