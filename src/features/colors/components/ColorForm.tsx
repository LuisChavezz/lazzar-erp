"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColorFormSchema, ColorFormValues } from "../schemas/color.schema";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { SettingsIcon } from "../../../components/Icons";
import { useCreateColor } from "../hooks/useCreateColor";
import { useUpdateColor } from "../hooks/useUpdateColor";
import { Color } from "../interfaces/color.interface";

interface ColorFormProps {
  onSuccess: () => void;
  colorToEdit?: Color | null;
}

export default function ColorForm({ onSuccess, colorToEdit }: ColorFormProps) {
  const isEditing = Boolean(colorToEdit?.id);
  const emptyValues: ColorFormValues = {
    nombre: "",
    codigo_hex: "FAFAFA",
  };
  const editValues: ColorFormValues = colorToEdit
    ? {
        nombre: colorToEdit.nombre,
        codigo_hex: colorToEdit.codigo_hex,
      }
    : emptyValues;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ColorFormValues>({
    resolver: zodResolver(ColorFormSchema),
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const selectedHex = watch("codigo_hex");
  const { mutateAsync: createColor, isPending: isCreating } = useCreateColor(setError);
  const { mutateAsync: updateColor, isPending: isUpdating } = useUpdateColor(setError);
  const [isLoading, setIsLoading] = useState(false);
  const isPending = isCreating || isUpdating || isLoading;

  const onSubmit = async (data: ColorFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        nombre: data.nombre,
        codigo_hex: data.codigo_hex.toUpperCase(),
      };
      if (isEditing && colorToEdit) {
        await updateColor({ id: colorToEdit.id, ...payload });
      } else {
        await createColor(payload);
      }
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
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
                  placeholder="FF0000"
                  className="font-mono uppercase"
                  maxLength={6}
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
                    style={{ backgroundColor: `#${selectedHex}` }}
                  />
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {selectedHex.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={() => reset()} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {colorToEdit ? "Actualizar Color" : "Registrar Color"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
