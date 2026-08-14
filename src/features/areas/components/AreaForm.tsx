"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { LayersIcon } from "@/src/components/Icons";
import { Area } from "../interfaces/area.interface";
import { useAreaForm } from "../hooks/useAreaForm";

interface AreaFormProps {
  onSuccess: () => void;
  areaToEdit?: Area | null;
}

export default function AreaForm({ onSuccess, areaToEdit }: AreaFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    departments,
    isLoadingDepartments,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useAreaForm({
    onSuccess,
    areaToEdit,
  });

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <LayersIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base del área y su departamento</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre del Área"
                      placeholder="Ej. Corte y Confección"
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
                <form.Field name="departamento">
                  {(field) => (
                    <FormSelect
                      label="Departamento"
                      name={field.name}
                      value={String(field.state.value)}
                      onChange={(event) => {
                        field.handleChange(Number(event.target.value));
                        clearFieldErrors("departamento");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("departamento", field.state.value);
                      }}
                      error={getError("departamento")}
                    >
                      <option value="0" disabled>
                        {isLoadingDepartments ? "Cargando departamentos..." : "Seleccionar..."}
                      </option>
                      {departments.map((department) => (
                        <option
                          key={department.id_departamento}
                          value={department.id_departamento}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {`${department.codigo} — ${department.nombre}`}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="codigo">
                  {(field) => (
                    <FormInput
                      label="Código"
                      placeholder="Ej. AREA-01 (opcional)"
                      forceUppercase
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("codigo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("codigo", field.state.value);
                      }}
                      error={getError("codigo")}
                    />
                  )}
                </form.Field>
              </div>

              {/*
                TODO: campo `responsable` (FK a hr.Empleado). Se omite hasta que
                exista el módulo de empleados en el frontend; el backend lo acepta
                como opcional y al no enviarse conserva su valor actual.
              */}

              <div className="group/field md:col-span-2">
                <form.Field name="descripcion">
                  {(field) => (
                    <FormTextarea
                      label="Descripción"
                      rows={3}
                      placeholder="Describe la función del área (opcional)"
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
            {areaToEdit ? "Actualizar Área" : "Registrar Área"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
