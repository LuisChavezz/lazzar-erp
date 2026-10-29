"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { Position } from "../interfaces/position.interface";
import { usePositionForm } from "../hooks/usePositionForm";

interface PositionFormProps {
  onSuccess: () => void;
  positionToEdit?: Position | null;
}

/** Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`). */
export default function PositionForm({ onSuccess, positionToEdit }: PositionFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    areas,
    isLoadingAreas,
    isErrorAreas,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = usePositionForm({
    onSuccess,
    positionToEdit,
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
                  label="Nombre del Puesto"
                  placeholder="Ej. Supervisor de Producción"
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
            <form.Field name="area">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Área"
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={(event) => {
                    field.handleChange(Number(event.target.value));
                    clearFieldErrors("area");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("area", field.state.value);
                  }}
                  error={getError("area")}
                >
                  {/*
                    `area` es opcional y la opción 0 ("Sin área asignada")
                    es una elección válida. Por eso, si el catálogo NO
                    cargó, su texto cambia: "Sin área" leído ahí haría
                    pasar una falla de carga por una elección legítima.
                  */}
                  <option value="0">
                    {isLoadingAreas
                      ? "Cargando áreas..."
                      : isErrorAreas
                        ? "No se pudo cargar el catálogo de áreas"
                        : "Sin área asignada"}
                  </option>
                  {areas.map((area) => (
                    <option
                      key={area.id}
                      value={area.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {area.nombre}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>
            {/* Un catálogo caído NO se pinta como catálogo vacío (mismo criterio que `ContractForm`). */}
            {isErrorAreas && (
              <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                No se pudo cargar el catálogo de áreas. Revisa tu conexión e intenta abrir el
                diálogo de nuevo.
              </p>
            )}
          </div>

          <div className="group/field">
            <form.Field name="salario_base">
              {(field) => (
                <FormInput
                  label="Salario Base"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("salario_base");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("salario_base", field.state.value);
                  }}
                  error={getError("salario_base")}
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field md:col-span-2">
            <form.Field name="descripcion">
              {(field) => (
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Descripción"
                  rows={2}
                  placeholder="Describe las responsabilidades del puesto (opcional)"
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
            {positionToEdit ? "Actualizar Puesto" : "Registrar Puesto"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
