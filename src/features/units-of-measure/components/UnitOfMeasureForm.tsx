"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUnitOfMeasureStore } from "../stores/unit-of-measure.store";
import { UnitOfMeasureFormSchema, UnitOfMeasureFormValues } from "../schemas/unit-of-measure.schema";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { SettingsIcon, UnitsIcon } from "../../../components/Icons";
import toast from "react-hot-toast";

interface UnitOfMeasureFormProps {
  onSuccess: () => void;
}

export default function UnitOfMeasureForm({ onSuccess }: UnitOfMeasureFormProps) {
  const addUnit = useUnitOfMeasureStore((state) => state.addUnit);
  const updateUnit = useUnitOfMeasureStore((state) => state.updateUnit);
  const selectedUnit = useUnitOfMeasureStore((state) => state.selectedUnit);
  const isLoading = useUnitOfMeasureStore((state) => state.isLoading);
  const setIsLoading = useUnitOfMeasureStore((state) => state.setIsLoading);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UnitOfMeasureFormValues>({
    resolver: zodResolver(UnitOfMeasureFormSchema),
    defaultValues: {
      clave: "",
      nombre: "",
      estatus: true,
    },
    values: selectedUnit
      ? {
          clave: selectedUnit.clave,
          nombre: selectedUnit.nombre,
          estatus: selectedUnit.estatus,
        }
      : undefined,
  });

  const isActive = watch("estatus");

  const onSubmit = async (data: UnitOfMeasureFormValues) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const clave = data.clave.toUpperCase();

      if (selectedUnit) {
        updateUnit({
          ...selectedUnit,
          ...data,
          clave,
        });
        toast.success("Unidad de medida actualizada correctamente");
      } else {
        const now = new Date().toISOString();
        addUnit({
          id: Date.now(),
          clave,
          nombre: data.nombre,
          estatus: data.estatus,
          created_at: now,
          updated_at: now,
        });
        toast.success("Unidad de medida registrada correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar la unidad de medida");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isLoading} className="group-disabled:opacity-50">
        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <UnitsIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field">
                <FormInput
                  label="Clave"
                  placeholder="Ej. KG"
                  className="font-mono uppercase"
                  {...register("clave")}
                  error={errors.clave}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Nombre"
                  placeholder="Ej. Kilogramo"
                  className="text-2xl font-bold"
                  {...register("nombre")}
                  error={errors.nombre}
                />
              </div>
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
                  <p className="text-xs text-slate-500">Control de disponibilidad</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    {...register("estatus")}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {isActive ? "Unidad activa" : "Unidad inactiva"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isActive ? "Disponible para catálogos" : "No disponible para selección"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={() => reset()} disabled={isLoading} />
          <FormSubmitButton isPending={isLoading} loadingLabel="Guardando...">
            {selectedUnit ? "Actualizar Unidad" : "Registrar Unidad"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
