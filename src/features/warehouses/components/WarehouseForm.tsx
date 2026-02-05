"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WarehouseFormSchema, WarehouseFormValues } from "../schemas/warehouse.schema";
import { useWarehouseStore } from "../stores/warehouse.store";
import { FormInput } from "../../../components/FormInput";
import { MapPinIcon, SettingsIcon } from "../../../components/Icons";
import toast from "react-hot-toast";
import { Slider, Flex, Text } from "@radix-ui/themes";
import { useEffect } from "react";

interface WarehouseFormProps {
  onSuccess: () => void;
}

export default function WarehouseForm({ onSuccess }: WarehouseFormProps) {

  // Manejar la adición de un almacén
  const addWarehouse = useWarehouseStore((state) => state.addWarehouse);
  const updateWarehouse = useWarehouseStore((state) => state.updateWarehouse);
  const selectedWarehouse = useWarehouseStore((state) => state.selectedWarehouse);
  const isLoading = useWarehouseStore((state) => state.isLoading);
  const setIsLoading = useWarehouseStore((state) => state.setIsLoading);

  // Manejar la validación del formulario
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<WarehouseFormValues>({ // Configurar el formulario con Hook Form
    resolver: zodResolver(WarehouseFormSchema), // Usar el esquema de validación
    defaultValues: { // Valores por defecto para el formulario
      name: "",
      location: "",
      manager: "",
      capacity: 0,
      status: "Activo",
      type: "",
    },
  });

  // Effect to load selected warehouse data
  useEffect(() => {
    if (selectedWarehouse) {
      setValue("name", selectedWarehouse.name);
      setValue("location", selectedWarehouse.location);
      setValue("manager", selectedWarehouse.manager);
      setValue("capacity", selectedWarehouse.capacity);
      setValue("status", selectedWarehouse.status);
      setValue("type", selectedWarehouse.type);
    } else {
      reset({
        name: "",
        location: "",
        manager: "",
        capacity: 0,
        status: "Activo",
        type: "",
      });
    }
  }, [selectedWarehouse, setValue, reset]);

  // Manejar el envío del formulario
  const onSubmit = async (values: WarehouseFormValues) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Simular una operación asíncrona
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (selectedWarehouse) {
        updateWarehouse(selectedWarehouse.id, values);
        toast.success("Almacén actualizado exitosamente");
      } else {
        addWarehouse({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
          ...values,
        });
        toast.success("Almacén registrado exitosamente");
      }
      
      reset();
      onSuccess();

    } catch (error) {
      console.error(error);
      toast.error(selectedWarehouse ? "Error al actualizar el almacén" : "Error al registrar el almacén");

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isLoading} className={`space-y-8 transition-opacity duration-200 ${isLoading ? "opacity-60" : ""}`}>
        {/* 1. Encabezado e Información Principal */}
        <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none group hover:border-sky-200 dark:hover:border-sky-900 transition-colors duration-300">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">
            {/* Inputs Principales */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
              <div className="md:col-span-2 group/field">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-sky-500">
                  Nombre del Almacén
                </label>
                <input
                  type="text"
                  className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 focus:border-sky-500 dark:focus:border-sky-500 px-1 py-2 text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 outline-none transition-colors"
                  placeholder="Ej. Almacén Central"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="md:col-span-2 group/field">
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-9 w-5 h-5 text-slate-400" />
                  <FormInput
                    label="Ubicación"
                    placeholder="Ej. Ciudad de México, CDMX"
                    className="pl-10"
                    {...register("location")}
                    error={errors.location}
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
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Detalles Operativos
                  </h3>
                  <p className="text-xs text-slate-500">Información de gestión y capacidad</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <FormInput
                      label="Responsable (Manager)"
                      placeholder="Nombre del encargado"
                      {...register("manager")}
                      error={errors.manager}
                    />
                  </div>
                  <div className="group">
                    <FormInput
                      label="Tipo de Almacén"
                      placeholder="Ej. Distribución, Regional"
                      {...register("type")}
                      error={errors.type}
                    />
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-white/5"></div>

                <div>
                   <h4 className="text-[11px] font-bold text-sky-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full border border-sky-500"></span>
                    Capacidad y Estado
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-3 block transition-colors group-focus-within:text-sky-500">
                      Capacidad / Ocupación Actual
                    </label>
                    <Controller
                      name="capacity"
                      control={control}
                      render={({ field }) => (
                        <Flex align="center" gap="4" className="px-1 h-10.5">
                          <Slider
                            defaultValue={[0]}
                            value={[Number(field.value) || 0]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            max={100}
                            step={1}
                            className="flex-1 cursor-pointer"
                          />
                          <Text size="2" weight="bold" className="text-sky-600 dark:text-sky-400 w-12 text-right">
                            {field.value || 0}%
                          </Text>
                        </Flex>
                      )}
                    />
                    {errors.capacity && (
                      <p className="text-xs text-red-600 mt-1">{errors.capacity.message}</p>
                    )}
                  </div>
                    
                    <div className="group">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                        Estado
                      </label>
                      <select
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
                        {...register("status")}
                      >
                        <option value="Activo" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Activo</option>
                        <option value="Inactivo" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Inactivo</option>
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

        <div className="flex justify-end gap-3 pb-8">
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
            {isLoading ? "Guardando..." : selectedWarehouse ? "Actualizar Almacén" : "Registrar Almacén"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
