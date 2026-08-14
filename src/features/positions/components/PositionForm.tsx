"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ClipboardListIcon } from "@/src/components/Icons";
import { Position } from "../interfaces/position.interface";
import { usePositionForm } from "../hooks/usePositionForm";

interface PositionFormProps {
  onSuccess: () => void;
  positionToEdit?: Position | null;
}

export default function PositionForm({ onSuccess, positionToEdit }: PositionFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    areas,
    isLoadingAreas,
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
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ClipboardListIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base del puesto y su área</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre del Puesto"
                      placeholder="Ej. Supervisor de Producción"
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
                <form.Field name="area">
                  {(field) => (
                    <FormSelect
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
                      <option value="0">
                        {isLoadingAreas ? "Cargando áreas..." : "Sin área asignada"}
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
                      className="dark:scheme-dark"
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field md:col-span-2">
                <form.Field name="descripcion">
                  {(field) => (
                    <FormTextarea
                      label="Descripción"
                      rows={3}
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
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {positionToEdit ? "Actualizar Puesto" : "Registrar Puesto"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
