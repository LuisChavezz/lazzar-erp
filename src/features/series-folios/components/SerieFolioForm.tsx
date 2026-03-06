"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SerieFolioFormSchema, SerieFolioFormValues } from "../schemas/serie-folio.schema";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { InfoIcon, SettingsIcon } from "../../../components/Icons";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { useCreateSerieFolio } from "../hooks/useCreateSerieFolio";
import { useUpdateSerieFolio } from "../hooks/useUpdateSerieFolio";
import { SerieFolio } from "../interfaces/serie-folio.interface";

interface SerieFolioFormProps {
  onSuccess: () => void;
  serieFolioToEdit?: SerieFolio | null;
}

export default function SerieFolioForm({ onSuccess, serieFolioToEdit }: SerieFolioFormProps) {
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const selectedBranch = useWorkspaceStore((state) => state.selectedBranch);
  const { branches, isLoading: isLoadingBranches } = useCompanyBranches(selectedCompany.id);

  const isEditing = Boolean(serieFolioToEdit?.id_serie_folio);
  const emptyValues: SerieFolioFormValues = {
    tipo_documento: "",
    serie: "",
    folio_inicial: 1,
    folio_final: 9999,
    prefijo: "",
    sufijo: "",
    relleno_ceros: 4,
    separador: "",
    incluir_anio: false,
    reiniciar_anual: false,
    estatus: "activo",
    sucursal: selectedBranch?.id ?? 0,
  };

  const editValues: SerieFolioFormValues = serieFolioToEdit
    ? {
        tipo_documento: serieFolioToEdit.tipo_documento,
        serie: serieFolioToEdit.serie,
        folio_inicial: serieFolioToEdit.folio_inicial,
        folio_final: serieFolioToEdit.folio_final,
        prefijo: serieFolioToEdit.prefijo ?? "",
        sufijo: serieFolioToEdit.sufijo ?? "",
        relleno_ceros: serieFolioToEdit.relleno_ceros,
        separador: serieFolioToEdit.separador ?? "",
        incluir_anio: serieFolioToEdit.incluir_anio,
        reiniciar_anual: serieFolioToEdit.reiniciar_anual,
        estatus: serieFolioToEdit.estatus as SerieFolioFormValues["estatus"],
        sucursal: serieFolioToEdit.sucursal,
      }
    : emptyValues;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<SerieFolioFormValues>({
    resolver: zodResolver(SerieFolioFormSchema),
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const { mutateAsync: createSerieFolio, isPending: isCreating } = useCreateSerieFolio(setError);
  const { mutateAsync: updateSerieFolio, isPending: isUpdating } = useUpdateSerieFolio(setError);
  const [isLoading, setIsLoading] = useState(false);
  const isPending = isCreating || isUpdating || isLoading;

  const onSubmit = async (values: SerieFolioFormValues) => {
    setIsLoading(true);
    try {
      if (isEditing && serieFolioToEdit) {
        await updateSerieFolio({ ...serieFolioToEdit, ...values });
        reset(editValues);
      } else {
        await createSerieFolio(values);
        reset(emptyValues);
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
              <InfoIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <FormInput
                  label="Tipo de Documento"
                  placeholder="Ej. Factura"
                  variant="ghost"
                  className="text-3xl font-bold"
                  {...register("tipo_documento")}
                  error={errors.tipo_documento}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Serie"
                  placeholder="Ej. F"
                  {...register("serie")}
                  error={errors.serie}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Separador"
                  placeholder="-"
                  {...register("separador")}
                  error={errors.separador}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Prefijo"
                  placeholder="Ej. FAC"
                  {...register("prefijo")}
                  error={errors.prefijo}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Sufijo"
                  placeholder="Ej. 2025"
                  {...register("sufijo")}
                  error={errors.sufijo}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Configuración de Folios
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormInput
                label="Folio Inicial"
                type="number"
                {...register("folio_inicial", { valueAsNumber: true })}
                error={errors.folio_inicial}
              />
              <FormInput
                label="Folio Final"
                type="number"
                {...register("folio_final", { valueAsNumber: true })}
                error={errors.folio_final}
              />
              <FormInput
                label="Relleno de Ceros"
                type="number"
                {...register("relleno_ceros", { valueAsNumber: true })}
                error={errors.relleno_ceros}
              />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Sucursal y Estado
                </h3>
                <p className="text-xs text-slate-500">Configuración operativa</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormSelect
                  label="Sucursal"
                  {...register("sucursal", { valueAsNumber: true })}
                  error={errors.sucursal}
                >
                  <option value="0" disabled>
                    {isLoadingBranches ? "Cargando sucursales..." : "Seleccionar..."}
                  </option>
                  {branches.map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {branch.codigo} - {branch.nombre}
                    </option>
                  ))}
                </FormSelect>

                <FormSelect label="Estatus" {...register("estatus")} error={errors.estatus}>
                  <option value="activo" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    Activo
                  </option>
                  <option value="inactivo" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    Inactivo
                  </option>
                </FormSelect>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                    Incluir Año
                  </label>
                  <Controller
                    control={control}
                    name="incluir_anio"
                    render={({ field: { onChange, value, ...field } }) => (
                      <select
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
                        {...field}
                        value={value ? "true" : "false"}
                        onChange={(event) => onChange(event.target.value === "true")}
                      >
                        <option value="true" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">
                          Sí
                        </option>
                        <option value="false" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">
                          No
                        </option>
                      </select>
                    )}
                  />
                  {errors.incluir_anio && (
                    <p className="text-xs text-red-600 mt-1">{errors.incluir_anio.message}</p>
                  )}
                </div>

                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                    Reinicio Anual
                  </label>
                  <Controller
                    control={control}
                    name="reiniciar_anual"
                    render={({ field: { onChange, value, ...field } }) => (
                      <select
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
                        {...field}
                        value={value ? "true" : "false"}
                        onChange={(event) => onChange(event.target.value === "true")}
                      >
                        <option value="true" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">
                          Sí
                        </option>
                        <option value="false" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">
                          No
                        </option>
                      </select>
                    )}
                  />
                  {errors.reiniciar_anual && (
                    <p className="text-xs text-red-600 mt-1">{errors.reiniciar_anual.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton
            onClick={() => reset(isEditing ? editValues : emptyValues)}
            disabled={isPending}
          />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Serie y Folio" : "Registrar Serie y Folio"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
