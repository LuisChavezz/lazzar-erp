"use client";

import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { ProductCategoriesIcon } from "../../../components/Icons";
import { ProductCategory } from "../interfaces/product-category.interface";
import { useProductCategoryForm } from "../hooks/useProductCategoryForm";

interface ProductCategoryFormProps {
  onSuccess: () => void;
  categoryToEdit?: ProductCategory | null;
}

export default function ProductCategoryForm({ onSuccess, categoryToEdit }: ProductCategoryFormProps) {
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
  } = useProductCategoryForm({
    onSuccess,
    categoryToEdit,
  });

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ProductCategoriesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base de la categoría</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre de la Categoría"
                      placeholder="Ej. Camisas"
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
                <div className="relative">
                  <div className="absolute left-3 top-9 text-slate-400 font-mono text-sm">#</div>
                  <form.Field name="codigo">
                    {(field) => (
                      <FormInput
                        label="Código"
                        placeholder="Ej. CAT-001"
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

              <div className="group/field md:col-span-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                  Descripción
                </label>
                <form.Field name="descripcion">
                  {(field) => (
                    <>
                      <textarea
                        rows={3}
                        placeholder="Describe la categoría"
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white resize-none"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(event.target.value);
                          clearFieldErrors("descripcion");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("descripcion", field.state.value);
                        }}
                      />
                      {getError("descripcion") && (
                        <p className="text-xs text-red-600 mt-1">
                          {getError("descripcion")?.message}
                        </p>
                      )}
                    </>
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Categoría" : "Registrar Categoría"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
