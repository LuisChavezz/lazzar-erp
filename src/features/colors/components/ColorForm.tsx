"use client";

import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { ColorsIcon } from "../../../components/Icons";
import { Color } from "../interfaces/color.interface";
import { useColorForm } from "../hooks/useColorForm";

interface ColorFormProps {
  onSuccess: () => void;
  colorToEdit?: Color | null;
}

export default function ColorForm({ onSuccess, colorToEdit }: ColorFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    selectedHex,
    getError,
    clearFieldErrors,
    validateField,
    updateHexValue,
    handleReset,
    handleFormSubmit,
  } = useColorForm({
    onSuccess,
    colorToEdit,
  });

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ColorsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base y vista previa del color</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre del Color"
                      placeholder="Ej. Rojo Carmín"
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
                <form.Field name="codigo_hex">
                  {(field) => (
                    <FormInput
                      label="Código HEX"
                      placeholder="FF0000"
                      className="font-mono uppercase"
                      maxLength={6}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        updateHexValue(event.target.value, field.handleChange);
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("codigo_hex", field.state.value);
                      }}
                      error={getError("codigo_hex")}
                    />
                  )}
                </form.Field>
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
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {colorToEdit ? "Actualizar Color" : "Registrar Color"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
