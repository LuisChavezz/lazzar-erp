"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import type { CostCenter } from "../interfaces/cost-center.interface";
import { useCostCenterForm } from "../hooks/useCostCenterForm";

interface CostCenterFormProps {
  onSuccess: () => void;
  centroToEdit?: CostCenter | null;
}

/**
 * Alta y edición de un centro de costo.
 *
 * NO se capturan aquí:
 *  - `empresa`: la resuelve el backend.
 *  - `activo`: se administra desde la acción "Dar de baja"/"Reactivar" de la
 *    fila. Como la edición usa PATCH y el payload no lo incluye, guardar el
 *    formulario CONSERVA el estatus que el centro ya tuviera.
 *
 * Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`).
 */
export default function CostCenterForm({
  onSuccess,
  centroToEdit,
}: CostCenterFormProps) {
  const {
    form,
    formRef,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useCostCenterForm({ onSuccess, centroToEdit });

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <div className="md:col-span-2">
            <form.Field name="nombre">
              {(field) => (
                <FormInput
                  label="Nombre del Centro de Costo"
                  placeholder="Ej. Administración"
                  className={COMPACT_FIELD_CLS}
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

          <div>
            <form.Field name="codigo">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Código"
                  placeholder="Ej. CC-01"
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
            {!getError("codigo") && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                No puede repetirse entre los centros de costo activos de la
                empresa.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <form.Field name="descripcion">
              {(field) => (
                // Texto libre: SIN `forceUppercase`. Las mayúsculas forzadas se
                // reservan a códigos e identificadores cortos —ningún
                // `<textarea>` del proyecto las usa—.
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Descripción"
                  rows={3}
                  placeholder="Describe para qué se usa este centro de costo (opcional)"
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
            {isEditing ? "Actualizar Centro" : "Registrar Centro"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
