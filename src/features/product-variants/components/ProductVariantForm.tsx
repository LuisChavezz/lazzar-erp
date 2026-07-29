"use client";

import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { InfoIcon, ProductVariantsIcon, SettingsIcon } from "../../../components/Icons";
import MissingPrerequisites from "../../products/components/MissingPrerequisites";
import { ProductVariant } from "../interfaces/product-variant.interface";
import { useProductVariantForm } from "../hooks/useProductVariantForm";

interface ProductVariantFormProps {
  onSuccess: () => void;
  productVariantToEdit?: ProductVariant | null;
}

export default function ProductVariantForm({
  onSuccess,
  productVariantToEdit,
}: ProductVariantFormProps) {
  const {
    form,
    formRef,
    formKey,
    selectedCompany,
    isEditing,
    isPending,
    keepCreating,
    setKeepCreating,
    missingItems,
    activeProducts,
    activeColors,
    activeSizes,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useProductVariantForm({
    onSuccess,
    productVariantToEdit,
  });

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ProductVariantsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base de la variante</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="sku">
                  {(field) => (
                    <FormInput
                      label="SKU"
                      placeholder="Ej. SKU-001"
                      forceUppercase
                      className="text-2xl font-bold"
                      variant="ghost"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("sku");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("sku", field.state.value);
                      }}
                      error={getError("sku")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="producto">
                  {(field) => (
                    <FormSelect
                      label="Producto"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                        clearFieldErrors("producto");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("producto", field.state.value);
                      }}
                      error={getError("producto")}
                    >
                      <option value="0" disabled>
                        Seleccionar...
                      </option>
                      {activeProducts.map((product) => (
                        <option
                          key={product.id}
                          value={product.id}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {product.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="color">
                  {(field) => (
                    <FormSelect
                      label="Color"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                        clearFieldErrors("color");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("color", field.state.value);
                      }}
                      error={getError("color")}
                    >
                      <option value="0" disabled>
                        Seleccionar...
                      </option>
                      {activeColors.map((color) => (
                        <option
                          key={color.id}
                          value={color.id}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {color.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="talla">
                  {(field) => (
                    <FormSelect
                      label="Talla"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                        clearFieldErrors("talla");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("talla", field.state.value);
                      }}
                      error={getError("talla")}
                    >
                      <option value="0" disabled>
                        Seleccionar...
                      </option>
                      {activeSizes.map((size) => (
                        <option
                          key={size.id}
                          value={size.id}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {size.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="precio_base">
                  {(field) => (
                    <FormInput
                      label="Precio Base"
                      placeholder="0.00"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("precio_base");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("precio_base", field.state.value);
                      }}
                      error={getError("precio_base")}
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
              <InfoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Detalles de la variante
              </h3>
              <p className="text-xs text-slate-500">Información contextual de la empresa</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput
                  label="Empresa"
                  placeholder={selectedCompany?.nombre_comercial || selectedCompany?.razon_social || "Empresa activa"}
                readOnly
                tabIndex={-1}
                className="cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400 focus:bg-slate-100 dark:focus:bg-zinc-800 focus:ring-0 focus:border-slate-200 dark:focus:border-zinc-700"
              />
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
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3">
                  <form.Field name="activo">
                    {(field) => (
                      <>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                          checked={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.checked);
                            clearFieldErrors("activo");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("activo", field.state.value);
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {field.state.value ? "Variante activa" : "Variante inactiva"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {field.state.value
                              ? "Disponible para selección"
                              : "No disponible para selección"}
                          </p>
                        </div>
                      </>
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pb-8 mt-8 sm:flex-row sm:items-center sm:justify-end">
          {!isEditing ? (
            <label className="inline-flex items-center gap-2 rounded-xl border cursor-pointer border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={keepCreating}
                onChange={(event) => setKeepCreating(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 focus:ring-sky-500"
                aria-label="Seguir registrando"
              />
              Seguir registrando
            </label>
          ) : null}
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Variante" : "Registrar Variante"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
