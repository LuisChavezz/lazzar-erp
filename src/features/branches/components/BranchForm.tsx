"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BranchFormSchema, BranchFormValues } from "../schemas/branch.schema";
import { useRegisterBranch } from "../hooks/useRegisterBranch";
import { MapPinIcon, SettingsIcon } from "../../../components/Icons";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";

interface BranchFormProps {
  onSuccess: () => void;
}

export default function BranchForm({ onSuccess }: BranchFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(BranchFormSchema),
    defaultValues: {
      nombre: "",
      codigo: "",
      telefono: "",
      email: "",
      direccion_linea1: "",
      direccion_linea2: "",
      ciudad: "",
      estado: "",
      cp: "",
      pais: "",
      estatus: "activo",
    },
  });

  const { mutate: registerBranch, isPending } = useRegisterBranch(setError);

  const onSubmit = (values: BranchFormValues) => {
    registerBranch(values, {
      onSuccess: () => {
        reset();
        onSuccess();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isPending} className={`space-y-8 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}>
        {/* 1. Encabezado e Información Principal */}
        <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none group hover:border-sky-200 dark:hover:border-sky-900 transition-colors duration-300">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

          <div className="relative z-10">
            {/* Inputs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
              <div className="md:col-span-2">
                <FormInput
                  label="Nombre de la Sucursal"
                  placeholder="Nombre de la sucursal"
                  variant="ghost"
                  {...register("nombre")}
                  error={errors.nombre}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Código"
                  placeholder="SUC-001"
                  {...register("codigo")}
                  error={errors.codigo}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Columna Izquierda: Dirección */}
          <div className="w-full space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                  <MapPinIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Ubicación
                  </h3>
                  <p className="text-xs text-slate-500">Dirección física de la sucursal</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="group">
                  <FormInput
                    label="Dirección Línea 1"
                    placeholder="Calle, Número"
                    {...register("direccion_linea1")}
                    error={errors.direccion_linea1}
                  />
                </div>
                <div className="group">
                  <FormInput
                    label="Dirección Línea 2"
                    placeholder="Colonia, Interior (Opcional)"
                    {...register("direccion_linea2")}
                    error={errors.direccion_linea2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <FormInput
                      label="Ciudad"
                      placeholder="Ciudad"
                      {...register("ciudad")}
                      error={errors.ciudad}
                    />
                  </div>
                  <div className="group">
                    <FormInput
                      label="Estado"
                      placeholder="Estado"
                      {...register("estado")}
                      error={errors.estado}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <FormInput
                      label="Código Postal"
                      placeholder="CP"
                      {...register("cp")}
                      error={errors.cp}
                    />
                  </div>
                  <div className="group">
                    <FormInput
                      label="País"
                      placeholder="País"
                      {...register("pais")}
                      error={errors.pais}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Contacto y Configuración */}
          <div className="w-full space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Detalles
                  </h3>
                  <p className="text-xs text-slate-500">Contacto y configuración</p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                 {/* Contacto */}
                 <div>
                  <h4 className="text-[11px] font-bold text-sky-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full border border-sky-500"></span>
                    Contacto
                  </h4>
                  <div className="space-y-6">
                    <div className="group">
                      <FormInput
                        label="Email de Contacto"
                        type="email"
                        placeholder="sucursal@empresa.com"
                        {...register("email")}
                        error={errors.email}
                      />
                    </div>
                    <div className="group">
                      <FormInput
                        label="Teléfono"
                        type="tel"
                        {...register("telefono")}
                        error={errors.telefono}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-white/5"></div>

                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                    Estatus
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
                    {...register("estatus")}
                  >
                    <option value="activo" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Activo</option>
                    <option value="inactivo" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">Inactivo</option>
                  </select>
                  {errors.estatus && (
                    <p className="text-xs text-red-600 mt-1">{errors.estatus.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <FormCancelButton onClick={() => reset()} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            Guardar Sucursal
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
