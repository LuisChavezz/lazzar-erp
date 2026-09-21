"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Button } from "@/src/components/Button";
import { ErrorState } from "@/src/components/ErrorState";
import { CheckCircleIcon, ProductIcon } from "@/src/components/Icons";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import MissingPrerequisites from "../../products/components/MissingPrerequisites";
import { useProductOnboardingForm } from "../hooks/useProductOnboardingForm";

const optionClassName = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

/**
 * Alta rápida de producto: nombre + tipo + categoría + precio base.
 *
 * NO se capturan aquí (el backend los resuelve o no existen en este alta):
 *  - `codigo`: lo genera el servidor (prefijo de la categoría + consecutivo) y
 *    se muestra al usuario tras el 201.
 *  - `empresa`: sale del usuario autenticado.
 *  - `descripcion`: no forma parte del alta rápida.
 * Las variantes (color/talla/SKU) son otro flujo.
 */
export default function ProductOnboardingForm() {
  const {
    form,
    formRef,
    isPending,
    isLoadingCatalogs,
    catalogsError,
    missingItems,
    categories,
    productTypes,
    createdProduct,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    startAnother,
    handleFormSubmit,
  } = useProductOnboardingForm();

  if (catalogsError) {
    return (
      <ErrorState
        title="Error al cargar los catálogos"
        message={extractErrorMessage(catalogsError, "No se pudieron cargar tipos y categorías.")}
      />
    );
  }

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  if (createdProduct) {
    return (
      <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-emerald-200 dark:border-emerald-500/20 p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div className="space-y-4 min-w-0">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Producto registrado
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 break-words">
                {createdProduct.nombre}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Código asignado
              </p>
              <p
                className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-300"
                data-testid="product-onboarding-codigo"
              >
                {createdProduct.codigo}
              </p>
            </div>
          </div>
        </div>
        {/* Sin botón "Cerrar" propio: `MainDialog` ya trae el suyo en el pie. */}
        <div className="flex flex-col gap-3 mt-8 sm:flex-row sm:justify-end">
          <Button variant="primary" onClick={startAnother}>
            Registrar otro
          </Button>
        </div>
      </section>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending}>
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <ProductIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Alta rápida de producto
              </h3>
              <p className="text-xs text-slate-500">
                El código se genera automáticamente a partir de la categoría
              </p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <form.Field name="nombre">
                {(field) => (
                  <FormInput
                    label="Nombre"
                    placeholder="Ej. Playera básica"
                    forceUppercase
                    maxLength={100}
                    variant="ghost"
                    className="text-2xl font-bold"
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

            <form.Field name="tipo">
              {(field) => (
                <FormSelect
                  label="Tipo"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                    clearFieldErrors("tipo");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("tipo", field.state.value);
                  }}
                  error={getError("tipo")}
                >
                  <option value="0" disabled>
                    {isLoadingCatalogs ? "Cargando..." : "Seleccionar..."}
                  </option>
                  {productTypes.map((type) => (
                    <option key={type.id} value={type.id} className={optionClassName}>
                      {type.codigo}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>

            <form.Field name="categoria_producto">
              {(field) => (
                <FormSelect
                  label="Categoría"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                    clearFieldErrors("categoria_producto");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("categoria_producto", field.state.value);
                  }}
                  error={getError("categoria_producto")}
                >
                  <option value="0" disabled>
                    {isLoadingCatalogs ? "Cargando..." : "Seleccionar..."}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id} className={optionClassName}>
                      {category.nombre} ({category.codigo})
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>

            <form.Field name="precio_base">
              {(field) => (
                <FormInput
                  label="Precio Base"
                  inputMode="decimal"
                  placeholder="0.00"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(sanitizeDecimalInput(event.target.value, 2));
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
        </section>

        <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-end">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            Registrar Producto
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
