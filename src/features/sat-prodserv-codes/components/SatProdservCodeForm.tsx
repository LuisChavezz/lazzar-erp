"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSatProdservCodeStore } from "../stores/sat-prodserv-code.store";
import {
  SatProdservCodeFormSchema,
  SatProdservCodeFormValues,
} from "../schemas/sat-prodserv-code.schema";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { SatProdServIcon, SettingsIcon } from "../../../components/Icons";
import toast from "react-hot-toast";
import { FormSelect } from "../../../components/FormSelect";

interface SatProdservCodeFormProps {
  onSuccess: () => void;
}

export default function SatProdservCodeForm({ onSuccess }: SatProdservCodeFormProps) {
  const addSatProdservCode = useSatProdservCodeStore((state) => state.addSatProdservCode);
  const updateSatProdservCode = useSatProdservCodeStore((state) => state.updateSatProdservCode);
  const selectedSatProdservCode = useSatProdservCodeStore(
    (state) => state.selectedSatProdservCode
  );
  const isLoading = useSatProdservCodeStore((state) => state.isLoading);
  const setIsLoading = useSatProdservCodeStore((state) => state.setIsLoading);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SatProdservCodeFormValues>({
    resolver: zodResolver(SatProdservCodeFormSchema),
    defaultValues: {
      codigo: "",
      descripcion: "",
      estatus: "Activo",
    },
    values: selectedSatProdservCode
      ? {
          codigo: selectedSatProdservCode.codigo,
          descripcion: selectedSatProdservCode.descripcion,
          estatus: selectedSatProdservCode.estatus,
        }
      : undefined,
  });

  const onSubmit = async (data: SatProdservCodeFormValues) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const codigo = data.codigo.toUpperCase();

      if (selectedSatProdservCode) {
        updateSatProdservCode({
          ...selectedSatProdservCode,
          ...data,
          codigo,
        });
        toast.success("Clave SAT actualizada correctamente");
      } else {
        addSatProdservCode({
          id_sat_prodserv: Date.now(),
          codigo,
          descripcion: data.descripcion,
          estatus: data.estatus,
        });
        toast.success("Clave SAT registrada correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar la clave SAT");
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
              <SatProdServIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field">
                <FormInput
                  label="Código SAT"
                  placeholder="Ej. 10101500"
                  className="font-mono uppercase"
                  {...register("codigo")}
                  error={errors.codigo}
                />
              </div>

              <div className="group/field md:col-span-2">
                <FormInput
                  label="Descripción"
                  placeholder="Ej. Materiales o productos"
                  className="text-2xl font-bold"
                  {...register("descripcion")}
                  error={errors.descripcion}
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
                <FormSelect label="Estatus" {...register("estatus")} error={errors.estatus}>
                  <option value="Activo" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    Activo
                  </option>
                  <option value="Inactivo" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    Inactivo
                  </option>
                </FormSelect>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={() => reset()} disabled={isLoading} />
          <FormSubmitButton isPending={isLoading} loadingLabel="Guardando...">
            {selectedSatProdservCode ? "Actualizar Clave SAT" : "Registrar Clave SAT"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
