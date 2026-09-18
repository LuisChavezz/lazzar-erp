"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { CentrosCostoIcon } from "@/src/components/Icons";
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
      <fieldset disabled={isPending}>
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CentrosCostoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información del Centro de Costo
              </h3>
              <p className="text-xs text-slate-500">
                Código, nombre y descripción del catálogo
              </p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <form.Field name="nombre">
                {(field) => (
                  <FormInput
                    label="Nombre del Centro de Costo"
                    placeholder="Ej. Administración"
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

            <div>
              <form.Field name="codigo">
                {(field) => (
                  <FormInput
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
        </section>

        <div className="flex justify-end gap-3 pb-4">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Centro" : "Registrar Centro"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
