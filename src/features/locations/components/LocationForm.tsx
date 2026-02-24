"use client";

import { useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LocationFormSchema, LocationFormValues } from "../schemas/location.schema";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { BuildingIcon, MapPinIcon, SettingsIcon } from "../../../components/Icons";
import MissingPrerequisites from "../../products/components/MissingPrerequisites";
import { useCreateLocation } from "../hooks/useCreateLocation";
import { useUpdateLocation } from "../hooks/useUpdateLocation";
import { useWarehouses } from "../../warehouses/hooks/useWarehouses";
import { Location } from "../interfaces/location.interface";

interface LocationFormProps {
  onSuccess: () => void;
  locationToEdit?: Location | null;
}

export default function LocationForm({ onSuccess, locationToEdit }: LocationFormProps) {
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouses();

  const activeWarehouses = warehouses.filter((warehouse) => warehouse.estatus === "Activo" || warehouse.estatus === "Mantenimiento");
  const missingItems = [
    activeWarehouses.length === 0 ? "Almacenes activos o en mantenimiento" : null,
  ].filter((item): item is string => Boolean(item));

  const isEditing = Boolean(locationToEdit?.id_ubicacion);
  const emptyValues: LocationFormValues = {
    almacen: 0,
    codigo: "",
    nombre: "",
    estatus: "Activo",
  };

  const hasWarehouse = activeWarehouses.some(
    (warehouse) => warehouse.id_almacen === locationToEdit?.almacen
  );

  const editValues: LocationFormValues = locationToEdit
    ? {
        almacen: hasWarehouse ? locationToEdit.almacen : 0,
        codigo: locationToEdit.codigo,
        nombre: locationToEdit.nombre,
        estatus: locationToEdit.estatus as LocationFormValues["estatus"],
      }
    : emptyValues;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(LocationFormSchema) as Resolver<LocationFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const { mutateAsync: createLocation, isPending: isCreating } = useCreateLocation(setError);
  const { mutateAsync: updateLocation, isPending: isUpdating } = useUpdateLocation(setError);

  const [isLoading, setIsLoading] = useState(false);
  const isPending = isCreating || isUpdating || isLoading;

  const onSubmit = async (values: LocationFormValues) => {
    setIsLoading(true);
    try {
      if (isEditing && locationToEdit) {
        await updateLocation({ id_ubicacion: locationToEdit.id_ubicacion, ...values });
        reset(editValues);
      } else {
        await createLocation(values);
        reset(emptyValues);
      }
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <FormInput
                  label="Nombre de la Ubicación"
                  placeholder="Ej. Pasillo A"
                  className="text-2xl font-bold"
                  variant="ghost"
                  {...register("nombre")}
                  error={errors.nombre}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Código"
                  placeholder="UBI-001"
                  {...register("codigo")}
                  error={errors.codigo}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <BuildingIcon className="w-4 h-4" />
              Almacén
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormSelect
                label="Almacén"
                {...register("almacen", { valueAsNumber: true })}
                error={errors.almacen}
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
                  <FormSelect label="Estatus de la ubicación" {...register("estatus")} error={errors.estatus}>
                    <option value="Activo" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      Activo
                    </option>
                    <option value="Inactivo" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      Inactivo
                    </option>
                    <option value="Mantenimiento" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      Mantenimiento
                    </option>
                  </FormSelect>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton
            onClick={() => reset(isEditing ? editValues : emptyValues)}
            disabled={isPending}
          />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Ubicación" : "Registrar Ubicación"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
