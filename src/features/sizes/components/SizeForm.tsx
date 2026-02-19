"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSizeStore } from "../stores/size.store";
import { SizeFormSchema, SizeFormValues } from "../schemas/size.schema";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { SettingsIcon } from "../../../components/Icons";
import toast from "react-hot-toast";

interface SizeFormProps {
  onSuccess: () => void;
}

export default function SizeForm({ onSuccess }: SizeFormProps) {
  const addSize = useSizeStore((state) => state.addSize);
  const updateSize = useSizeStore((state) => state.updateSize);
  const selectedSize = useSizeStore((state) => state.selectedSize);
  const isLoading = useSizeStore((state) => state.isLoading);
  const setIsLoading = useSizeStore((state) => state.setIsLoading);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SizeFormValues>({
    resolver: zodResolver(SizeFormSchema),
    defaultValues: {
      nombre: "",
      activo: true,
    },
    values: selectedSize
      ? {
          nombre: selectedSize.nombre,
          activo: selectedSize.activo,
        }
      : undefined,
  });

  const isActive = watch("activo");

  const onSubmit = async (data: SizeFormValues) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (selectedSize) {
        updateSize({
          ...selectedSize,
          ...data,
        });
        toast.success("Talla actualizada correctamente");
      } else {
        addSize({
          id: Date.now(),
          nombre: data.nombre,
          activo: data.activo,
        });
        toast.success("Talla registrada correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar la talla");
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
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <FormInput
                  label="Nombre de la Talla"
                  placeholder="Ej. M, L, XL"
                  variant="ghost"
                  className="text-3xl font-bold"
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
                    {...register("activo")}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {isActive ? "Talla activa" : "Talla inactiva"}
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
            {selectedSize ? "Actualizar Talla" : "Registrar Talla"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
