"use client";

import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { BuildingIcon, MapPinIcon } from "../../../components/Icons";
import { Warehouse } from "../interfaces/warehouse.interface";
import { useWarehouseForm } from "../hooks/useWarehouseForm";

interface WarehouseFormProps {
  onSuccess: () => void;
  warehouseToEdit?: Warehouse | null;
}

export default function WarehouseForm({ onSuccess, warehouseToEdit }: WarehouseFormProps) {
  const {
    form,
    formKey,
    isEditing,
    isPending,
    branches,
    isLoadingBranches,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useWarehouseForm({
    onSuccess,
    warehouseToEdit,
  });

  return (
    <form key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base del almacén</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
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
                      label="Nombre"
                      placeholder="Ej. Almacén Central"
                      className="text-2xl font-bold"
                      variant="ghost"
                      error={getError("nombre")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="codigo">
                  {(field) => (
                    <FormInput
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
                      label="Código"
                      placeholder="ALM-001 o texto"
                      error={getError("codigo")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Sucursal
              </h3>
              <p className="text-xs text-slate-500">Asignación de sucursal del almacén</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form.Field name="sucursal">
                {(field) => (
                  <FormSelect
                    name={field.name}
                    value={String(field.state.value)}
                    onChange={(event) => {
                      field.handleChange(Number(event.target.value));
                      clearFieldErrors("sucursal");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("sucursal", field.state.value);
                    }}
                    label="Sucursal"
                    error={getError("sucursal")}
                  >
                    <option value="0" disabled>
                      {isLoadingBranches ? "Cargando sucursales..." : "Seleccionar..."}
                    </option>
                    {branches.map((branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {branch.codigo} - {branch.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Almacén" : "Registrar Almacén"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
