"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { Area } from "../interfaces/area.interface";
import { useAreaForm } from "../hooks/useAreaForm";

interface AreaFormProps {
  onSuccess: () => void;
  areaToEdit?: Area | null;
}

/** Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`). */
export default function AreaForm({ onSuccess, areaToEdit }: AreaFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    departments,
    isLoadingDepartments,
    isErrorDepartments,
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
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <div className="group/field md:col-span-2">
            <form.Field name="nombre">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Nombre del Área"
                  placeholder="Ej. Corte y Confección"
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

          <div className="group/field">
            <form.Field name="departamento">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
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
                    {isLoadingDepartments
                      ? "Cargando departamentos..."
                      : isErrorDepartments
                        ? "No se pudo cargar el catálogo de departamentos"
                        : "Seleccionar..."}
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
            {/* Un catálogo caído NO se pinta como catálogo vacío (mismo criterio que `ContractForm`). */}
            {isErrorDepartments && (
              <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                No se pudo cargar el catálogo de departamentos. Revisa tu conexión e intenta
                abrir el diálogo de nuevo.
              </p>
            )}
          </div>

          <div className="group/field">
            <form.Field name="codigo">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
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
                  className={COMPACT_FIELD_CLS}
                  label="Descripción"
                  rows={2}
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

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {areaToEdit ? "Actualizar Área" : "Registrar Área"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
