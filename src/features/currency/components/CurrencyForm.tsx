"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CurrencyFormSchema, CurrencyFormValues } from "../schemas/currency.schema";
import { useCreateCurrency } from "../hooks/useCreateCurrency";
import { useUpdateCurrency } from "../hooks/useUpdateCurrency";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { SettingsIcon } from "../../../components/Icons";
import { Currency } from "../interfaces/currency.interface";

interface CurrencyFormProps {
  onSuccess: () => void;
  currencyToEdit?: Currency;
}

export default function CurrencyForm({ onSuccess, currencyToEdit }: CurrencyFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<CurrencyFormValues>({
    resolver: zodResolver(CurrencyFormSchema),
    defaultValues: currencyToEdit ? {
      nombre: currencyToEdit.nombre,
      codigo_iso: currencyToEdit.codigo_iso,
      simbolo: currencyToEdit.simbolo,
      decimales: currencyToEdit.decimales,
      estatus: currencyToEdit.estatus,
    } : {
      nombre: "",
      codigo_iso: "",
      simbolo: "$",
      decimales: 2,
      estatus: true,
    },
  });

  const { mutate: createCurrency, isPending: isCreating } = useCreateCurrency(setError);
  const { mutate: updateCurrency, isPending: isUpdating } = useUpdateCurrency(setError);

  const isPending = isCreating || isUpdating;

  const onSubmit = (values: CurrencyFormValues) => {
    if (currencyToEdit) {
      updateCurrency({ ...currencyToEdit, ...values }, {
        onSuccess: () => {
          onSuccess();
        },
      });
    } else {
      createCurrency(values, {
        onSuccess: () => {
          reset();
          onSuccess();
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isPending} className={`space-y-8 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}>
        {/* 1. Encabezado e Información Principal */}
        <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none group hover:border-sky-200 dark:hover:border-sky-900 transition-colors duration-300">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">
            {/* Inputs Principales */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
              <div className="md:col-span-2 group/field">
                <FormInput
                  label="Nombre de la Moneda"
                  placeholder="Ej. Peso Mexicano"
                  variant="ghost"
                  className="text-3xl font-bold"
                  {...register("nombre")}
                  error={errors.nombre}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Código ISO"
                  placeholder="MXN"
                  className="uppercase font-mono"
                  maxLength={3}
                  {...register("codigo_iso")}
                  error={errors.codigo_iso}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="w-full">
          {/* Columna Izquierda: Detalles */}
          <div className="w-full space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Detalles Técnicos
                  </h3>
                  <p className="text-xs text-slate-500">Configuración de formato y estado</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <FormInput
                      label="Símbolo"
                      placeholder="$"
                      {...register("simbolo")}
                      error={errors.simbolo}
                    />
                  </div>
                  <div className="group">
                    <FormInput
                      label="Decimales"
                      type="number"
                      placeholder="2"
                      {...register("decimales", { valueAsNumber: true })}
                      error={errors.decimales}
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
                      <Controller
                        control={control}
                        name="estatus"
                        render={({ field: { onChange, value, ...field } }) => (
                          <select
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
                            {...field}
                            value={value ? "true" : "false"}
                            onChange={(e) => onChange(e.target.value === "true")}
                          >
                            <option value="true" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Activo</option>
                            <option value="false" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Inactivo</option>
                          </select>
                        )}
                      />
                      {errors.estatus && (
                        <p className="text-xs text-red-600 mt-1">{errors.estatus.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <FormCancelButton onClick={() => reset()} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={currencyToEdit ? "Actualizando..." : "Guardando..."}
          >
            {currencyToEdit ? "Actualizar Moneda" : "Registrar Moneda"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
