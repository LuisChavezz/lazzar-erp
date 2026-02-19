"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useColorStore } from "../stores/color.store";
import { ColorFormSchema, ColorFormValues } from "../schemas/color.schema";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { SettingsIcon } from "../../../components/Icons";
import toast from "react-hot-toast";

interface ColorFormProps {
  onSuccess: () => void;
}

export default function ColorForm({ onSuccess }: ColorFormProps) {
  const addColor = useColorStore((state) => state.addColor);
  const updateColor = useColorStore((state) => state.updateColor);
  const selectedColor = useColorStore((state) => state.selectedColor);
  const isLoading = useColorStore((state) => state.isLoading);
  const setIsLoading = useColorStore((state) => state.setIsLoading);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ColorFormValues>({
    resolver: zodResolver(ColorFormSchema),
    defaultValues: {
      nombre: "",
      codigo_hex: "#000000",
      activo: true,
    },
    values: selectedColor
      ? {
          nombre: selectedColor.nombre,
          codigo_hex: selectedColor.codigo_hex,
          activo: selectedColor.activo,
        }
      : undefined,
  });

  const selectedHex = watch("codigo_hex");
  const isActive = watch("activo");

  const onSubmit = async (data: ColorFormValues) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (selectedColor) {
        updateColor({
          ...selectedColor,
          ...data,
          codigo_hex: data.codigo_hex.toUpperCase(),
        });
        toast.success("Color actualizado correctamente");
      } else {
        addColor({
          id: Date.now(),
          nombre: data.nombre,
          codigo_hex: data.codigo_hex.toUpperCase(),
          activo: data.activo,
        });
        toast.success("Color registrado correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar el color");
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
              <span
                className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700"
                style={{ backgroundColor: selectedHex }}
              />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <FormInput
                  label="Nombre del Color"
                  placeholder="Ej. Rojo Carmín"
                  variant="ghost"
                  className="text-3xl font-bold"
                  {...register("nombre")}
                  error={errors.nombre}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Código HEX"
                  placeholder="#FF0000"
                  className="font-mono uppercase"
                  maxLength={7}
                  {...register("codigo_hex")}
                  error={errors.codigo_hex}
                />
              </div>

              <div className="group/field">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                  Vista previa
                </label>
                <div className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-black/20 flex items-center px-3 gap-3">
                  <span
                    className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600"
                    style={{ backgroundColor: selectedHex }}
                  />
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {selectedHex}
                  </span>
                </div>
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
                      {isActive ? "Color activo" : "Color inactivo"}
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
            {selectedColor ? "Actualizar Color" : "Registrar Color"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
