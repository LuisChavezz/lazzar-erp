"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LocationFormSchema, LocationFormValues } from "../schemas/location.schema";
import { useLocationStore } from "../stores/location.store";
import { FormInput } from "../../../components/FormInput";
import { MapPinIcon, BuildingIcon } from "../../../components/Icons";
import toast from "react-hot-toast";
import { useEffect } from "react";

interface LocationFormProps {
  onSuccess: () => void;
}

export default function LocationForm({ onSuccess }: LocationFormProps) {

  // Manejar la adición de una ubicación
  const addLocation = useLocationStore((state) => state.addLocation);
  const updateLocation = useLocationStore((state) => state.updateLocation);
  const selectedLocation = useLocationStore((state) => state.selectedLocation);
  const isLoading = useLocationStore((state) => state.isLoading);
  const setIsLoading = useLocationStore((state) => state.setIsLoading);

  // Manejar la validación del formulario
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LocationFormValues>({ // Configurar el formulario con Hook Form
    resolver: zodResolver(LocationFormSchema), // Usar el esquema de validación
    defaultValues: { // Valores por defecto para el formulario
      name: "",
      code: "",
      warehouse: "",
      status: "Disponible",
      type: "",
    },
  });

  // Effect to load selected location data
  useEffect(() => {
    if (selectedLocation) {
      setValue("name", selectedLocation.name);
      setValue("code", selectedLocation.code);
      setValue("warehouse", selectedLocation.warehouse);
      setValue("status", selectedLocation.status);
      setValue("type", selectedLocation.type);
    } else {
      reset({
        name: "",
        code: "",
        warehouse: "",
        status: "Disponible",
        type: "",
      });
    }
  }, [selectedLocation, setValue, reset]);

  // Manejar el envío del formulario
  const onSubmit = async (data: LocationFormValues) => {
    setIsLoading(true);
    try {
      // Simular una petición a la API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (selectedLocation) {
        updateLocation(selectedLocation.id, data);
        toast.success("Ubicación actualizada correctamente");
      } else {
        addLocation({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
          ...data,
        });
        toast.success("Ubicación registrada correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar la ubicación");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isLoading} className="group-disabled:opacity-50">
        
        {/* Sección Principal: Nombre y Código */}
        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" />
              Información General
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 group-focus-within/field:text-sky-600 transition-colors">
                  Nombre de la Ubicación
                </label>
                <input 
                  type="text" 
                  className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 focus:border-sky-500 dark:focus:border-sky-500 px-1 py-2 text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 outline-none transition-colors"
                  placeholder="Ej. Pasillo A"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="md:col-span-2 group/field">
                <div className="relative">
                  <div className="absolute left-3 top-9 text-slate-400 font-mono text-sm">#</div>
                  <FormInput
                    label="Código"
                    placeholder="Ej. A-01-01"
                    className="pl-8 font-mono"
                    {...register("code")}
                    error={errors.code}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full">
          {/* Columna Izquierda: Información Operativa */}
          <div className="w-full space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <BuildingIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Detalles Operativos
                  </h3>
                  <p className="text-xs text-slate-500">Asignación y estado</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <FormInput
                      label="Almacén"
                      placeholder="Ej. Almacén Central"
                      {...register("warehouse")}
                      error={errors.warehouse}
                    />
                  </div>
                  <div className="group">
                    <FormInput
                      label="Tipo de Ubicación"
                      placeholder="Ej. Rack, Piso, Zona"
                      {...register("type")}
                      error={errors.type}
                    />
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-white/5"></div>

                <div>
                   <h4 className="text-[11px] font-bold text-sky-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full border border-sky-500"></span>
                    Estado
                  </h4>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="group">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                        Estado
                      </label>
                      <select
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
                        {...register("status")}
                      >
                        <option value="Disponible" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Disponible</option>
                        <option value="Ocupado" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Ocupado</option>
                        <option value="Mantenimiento" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Mantenimiento</option>
                      </select>
                      {errors.status && (
                        <p className="text-xs text-red-600 mt-1">{errors.status.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <button
            type="button"
            disabled={isLoading}
            className={`rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium cursor-pointer text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => reset()}
          >
            Limpiar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 cursor-pointer ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Guardando..." : selectedLocation ? "Actualizar Ubicación" : "Registrar Ubicación"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
