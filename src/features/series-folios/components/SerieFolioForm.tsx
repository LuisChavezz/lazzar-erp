"use client";

import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { InfoIcon, SettingsIcon } from "../../../components/Icons";
import { SerieFolio } from "../interfaces/serie-folio.interface";
import { useSerieFolioForm } from "../hooks/useSerieFolioForm";

interface SerieFolioFormProps {
  onSuccess: () => void;
  serieFolioToEdit?: SerieFolio | null;
}

export default function SerieFolioForm({ onSuccess, serieFolioToEdit }: SerieFolioFormProps) {
  const {
    form,
    formRef,
    formKey,
    isEditing,
    isPending,
    branches,
    isLoadingBranches,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useSerieFolioForm({
    onSuccess,
    serieFolioToEdit,
  });

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <InfoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base del documento y serie</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="tipo_documento">
                  {(field) => (
                    <FormInput
                      label="Tipo de Documento"
                      placeholder="Ej. Factura"
                      variant="ghost"
                      className="text-3xl font-bold"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("tipo_documento");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("tipo_documento", field.state.value);
                      }}
                      error={getError("tipo_documento")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="serie">
                  {(field) => (
                    <FormInput
                      label="Serie"
                      placeholder="Ej. F"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("serie");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("serie", field.state.value);
                      }}
                      error={getError("serie")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="separador">
                  {(field) => (
                    <FormInput
                      label="Separador"
                      placeholder="-"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("separador");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("separador", field.state.value);
                      }}
                      error={getError("separador")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="prefijo">
                  {(field) => (
                    <FormInput
                      label="Prefijo"
                      placeholder="Ej. FAC"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("prefijo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("prefijo", field.state.value);
                      }}
                      error={getError("prefijo")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="sufijo">
                  {(field) => (
                    <FormInput
                      label="Sufijo"
                      placeholder="Ej. 2025"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("sufijo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("sufijo", field.state.value);
                      }}
                      error={getError("sufijo")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Configuración de Folios
              </h3>
              <p className="text-xs text-slate-500">Rango y formato de numeración</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form.Field name="folio_inicial">
                {(field) => (
                  <FormInput
                    label="Folio Inicial"
                    type="number"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("folio_inicial");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("folio_inicial", field.state.value);
                    }}
                    error={getError("folio_inicial")}
                  />
                )}
              </form.Field>
              <form.Field name="folio_final">
                {(field) => (
                  <FormInput
                    label="Folio Final"
                    type="number"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("folio_final");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("folio_final", field.state.value);
                    }}
                    error={getError("folio_final")}
                  />
                )}
              </form.Field>
              <form.Field name="relleno_ceros">
                {(field) => (
                  <FormInput
                    label="Relleno de Ceros"
                    type="number"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("relleno_ceros");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("relleno_ceros", field.state.value);
                    }}
                    error={getError("relleno_ceros")}
                  />
                )}
              </form.Field>
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
                  Sucursal y Opciones
                </h3>
                <p className="text-xs text-slate-500">Configuración operativa</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field name="sucursal">
                  {(field) => (
                    <FormSelect
                      label="Sucursal"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                        clearFieldErrors("sucursal");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("sucursal", field.state.value);
                      }}
                      error={getError("sucursal")}
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
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                    Incluir Año
                  </label>
                  <form.Field name="incluir_anio">
                    {(field) => (
                      <select
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
                        name={field.name}
                        value={field.state.value ? "true" : "false"}
                        onChange={(event) => {
                          field.handleChange(event.target.value === "true");
                          clearFieldErrors("incluir_anio");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("incluir_anio", field.state.value);
                        }}
                      >
                        <option value="true" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">
                          Sí
                        </option>
                        <option value="false" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">
                          No
                        </option>
                      </select>
                    )}
                  </form.Field>
                  {getError("incluir_anio") && (
                    <p className="text-xs text-red-600 mt-1">{getError("incluir_anio")?.message}</p>
                  )}
                </div>

                <div className="group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                    Reinicio Anual
                  </label>
                  <form.Field name="reiniciar_anual">
                    {(field) => (
                      <select
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
                        name={field.name}
                        value={field.state.value ? "true" : "false"}
                        onChange={(event) => {
                          field.handleChange(event.target.value === "true");
                          clearFieldErrors("reiniciar_anual");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("reiniciar_anual", field.state.value);
                        }}
                      >
                        <option value="true" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">
                          Sí
                        </option>
                        <option value="false" className="text-slate-900 dark:text-white bg-white dark:bg-zinc-900">
                          No
                        </option>
                      </select>
                    )}
                  </form.Field>
                  {getError("reiniciar_anual") && (
                    <p className="text-xs text-red-600 mt-1">{getError("reiniciar_anual")?.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Serie y Folio" : "Registrar Serie y Folio"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
