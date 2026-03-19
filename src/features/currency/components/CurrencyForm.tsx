"use client";

import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { SettingsIcon, InfoIcon } from "../../../components/Icons";
import { Currency } from "../interfaces/currency.interface";
import { useCurrencyForm } from "../hooks/useCurrencyForm";

interface CurrencyFormProps {
  onSuccess: () => void;
  currencyToEdit?: Currency;
}

export default function CurrencyForm({ onSuccess, currencyToEdit }: CurrencyFormProps) {
  const {
    form,
    formKey,
    isEditing,
    isPending,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useCurrencyForm({
    onSuccess,
    currencyToEdit,
  });

  return (
    <form key={formKey} onSubmit={handleFormSubmit}>
      <fieldset disabled={isPending} className={`space-y-8 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}>
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <InfoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base de la moneda</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
              <div className="md:col-span-2 group/field">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre de la Moneda"
                      placeholder="Ej. Peso Mexicano"
                      variant="ghost"
                      className="text-3xl font-bold"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("nombre");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("nombre", field.state.value);
                      }}
                      error={getError("nombre")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="codigo_iso">
                  {(field) => (
                    <FormInput
                      label="Código ISO"
                      placeholder="MXN"
                      className="uppercase font-mono"
                      maxLength={3}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("codigo_iso");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("codigo_iso", field.state.value);
                      }}
                      error={getError("codigo_iso")}
                    />
                  )}
                </form.Field>
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
                    Detalles Técnicos
                  </h3>
                  <p className="text-xs text-slate-500">Configuración de formato</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <form.Field name="simbolo">
                      {(field) => (
                        <FormInput
                          label="Símbolo"
                          placeholder="$"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldErrors("simbolo");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("simbolo", field.state.value);
                          }}
                          error={getError("simbolo")}
                        />
                      )}
                    </form.Field>
                  </div>
                  <div className="group">
                    <form.Field name="decimales">
                      {(field) => (
                        <FormInput
                          label="Decimales"
                          type="number"
                          placeholder="2"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                            clearFieldErrors("decimales");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("decimales", field.state.value);
                          }}
                          error={getError("decimales")}
                        />
                      )}
                    </form.Field>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}
          >
            {isEditing ? "Actualizar Moneda" : "Registrar Moneda"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
