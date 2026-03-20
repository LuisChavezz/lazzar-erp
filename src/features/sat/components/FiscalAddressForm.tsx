"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { MapPinIcon } from "@/src/components/Icons";
import { useFiscalAddressForm } from "../hooks/useFiscalAddressForm";

interface FiscalAddressFormProps {
  onSuccess: () => void;
}

export default function FiscalAddressForm({ onSuccess }: FiscalAddressFormProps) {
  const {
    form,
    formRef,
    isSubmitting,
    getError,
    clearFieldError,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useFiscalAddressForm({ onSuccess });

  return (
    <form ref={formRef} onSubmit={handleFormSubmit}>
      <div className="space-y-8">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Ubicación
              </h3>
              <p className="text-xs text-slate-500">Detalles de la dirección fiscal</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <form.Field name="calle">
                  {(field) => (
                    <FormInput
                      label="Calle"
                      placeholder="Ej. Av. Reforma"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldError("calle");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("calle", field.state.value);
                      }}
                      error={getError("calle")}
                    />
                  )}
                </form.Field>
              </div>

              <form.Field name="numero_exterior">
                {(field) => (
                  <FormInput
                    label="Número Exterior"
                    placeholder="Ej. 123"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("numero_exterior");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("numero_exterior", field.state.value);
                    }}
                    error={getError("numero_exterior")}
                  />
                )}
              </form.Field>

              <form.Field name="numero_interior">
                {(field) => (
                  <FormInput
                    label="Número Interior"
                    placeholder="Ej. Depto 4B (Opcional)"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("numero_interior");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("numero_interior", field.state.value);
                    }}
                    error={getError("numero_interior")}
                  />
                )}
              </form.Field>

              <form.Field name="colonia">
                {(field) => (
                  <FormInput
                    label="Colonia"
                    placeholder="Ej. Centro"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("colonia");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("colonia", field.state.value);
                    }}
                    error={getError("colonia")}
                  />
                )}
              </form.Field>

              <form.Field name="codigo_postal">
                {(field) => (
                  <FormInput
                    label="Código Postal"
                    placeholder="Ej. 06000"
                    maxLength={5}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("codigo_postal");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("codigo_postal", field.state.value);
                    }}
                    error={getError("codigo_postal")}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Localidad y Región
              </h3>
              <p className="text-xs text-slate-500">Municipio, estado y país de operación</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form.Field name="localidad">
                {(field) => (
                  <FormInput
                    label="Localidad"
                    placeholder="Ej. Ciudad de México (Opcional)"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("localidad");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("localidad", field.state.value);
                    }}
                    error={getError("localidad")}
                  />
                )}
              </form.Field>

              <form.Field name="municipio">
                {(field) => (
                  <FormInput
                    label="Municipio / Alcaldía"
                    placeholder="Ej. Cuauhtémoc"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("municipio");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("municipio", field.state.value);
                    }}
                    error={getError("municipio")}
                  />
                )}
              </form.Field>

              <form.Field name="estado">
                {(field) => (
                  <FormInput
                    label="Estado"
                    placeholder="Ej. Ciudad de México"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("estado");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("estado", field.state.value);
                    }}
                    error={getError("estado")}
                  />
                )}
              </form.Field>

              <form.Field name="pais">
                {(field) => (
                  <FormInput
                    label="País"
                    placeholder="Ej. México"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("pais");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("pais", field.state.value);
                    }}
                    error={getError("pais")}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <FormCancelButton onClick={handleReset} disabled={isSubmitting} />
          <FormSubmitButton
            isPending={isSubmitting}
            loadingLabel="Guardando..."
          >
            Guardar Dirección
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
