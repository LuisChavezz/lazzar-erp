"use client";

import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { ProductTypesIcon } from "../../../components/Icons";
import { ProductType } from "../interfaces/product-type.interface";
import { useProductTypeForm } from "../hooks/useProductTypeForm";

interface ProductTypeFormProps {
  onSuccess: () => void;
  productTypeToEdit?: ProductType | null;
}

export default function ProductTypeForm({ onSuccess, productTypeToEdit }: ProductTypeFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useProductTypeForm({
    onSuccess,
    productTypeToEdit,
  });

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ProductTypesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base del tipo de producto</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field">
                <div className="relative">
                  <div className="absolute left-3 top-9 text-slate-400 font-mono text-sm">#</div>
                  <form.Field name="codigo">
                    {(field) => (
                      <FormInput
                        label="Código"
                        placeholder="Ej. TIPO-01"
                        className="pl-8 font-mono"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(event.target.value);
                          clearFieldErrors("codigo");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("codigo", field.state.value);
                        }}
                        error={getError("codigo")}
                      />
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Tipo" : "Registrar Tipo"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
