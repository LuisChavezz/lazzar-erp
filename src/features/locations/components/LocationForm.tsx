"use client";

import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { BuildingIcon, MapPinIcon, SettingsIcon } from "../../../components/Icons";
import MissingPrerequisites from "../../products/components/MissingPrerequisites";
import { Location } from "../interfaces/location.interface";
import { useLocationForm } from "../hooks/useLocationForm";

interface LocationFormProps {
  onSuccess: () => void;
  locationToEdit?: Location | null;
}

export default function LocationForm({ onSuccess, locationToEdit }: LocationFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    isLoadingWarehouses,
    activeWarehouses,
    missingItems,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useLocationForm({
    onSuccess,
    locationToEdit,
  });

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base de la ubicación</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="pasillo">
                  {(field) => (
                    <FormInput
                      label="Pasillo"
                      placeholder="Ej. Pasillo A"
                      className="text-2xl font-bold"
                      variant="ghost"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("pasillo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("pasillo", field.state.value);
                      }}
                      error={getError("pasillo")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="rack">
                  {(field) => (
                    <FormInput
                      label="Rack"
                      placeholder="RACK-01"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("rack");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("rack", field.state.value);
                      }}
                      error={getError("rack")}
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
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Almacén
              </h3>
              <p className="text-xs text-slate-500">Vinculación del almacén para la ubicación</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form.Field name="almacen">
                {(field) => (
                  <FormSelect
                    label="Almacén"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("almacen");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("almacen", field.state.value);
                    }}
                    error={getError("almacen")}
                  >
                    <option value="0" disabled>
                      {isLoadingWarehouses ? "Cargando almacenes..." : "Seleccionar..."}
                    </option>
                    {activeWarehouses.map((warehouse) => (
                      <option
                        key={warehouse.id_almacen}
                        value={warehouse.id_almacen}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {warehouse.codigo} - {warehouse.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="w-full">
          <div className="w-full space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Estado
                  </h3>
                  <p className="text-xs text-slate-500">Disponibilidad de la ubicación</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <form.Field name="estatus">
                    {(field) => (
                      <FormSelect
                        label="Estatus de la ubicación"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(event.target.value as Location["estatus"]);
                          clearFieldErrors("estatus");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("estatus", field.state.value);
                        }}
                        error={getError("estatus")}
                      >
                        <option
                          value="ACTIVO"
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          Activo
                        </option>
                        <option
                          value="INACTIVO"
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          Inactivo
                        </option>
                      </FormSelect>
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Ubicación" : "Registrar Ubicación"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
