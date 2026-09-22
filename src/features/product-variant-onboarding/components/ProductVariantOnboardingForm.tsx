"use client";

import { useState } from "react";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Button } from "@/src/components/Button";
import { ErrorState } from "@/src/components/ErrorState";
import { ItemPickerButton } from "@/src/components/ItemPickerButton";
import { CheckCircleIcon, ProductVariantsIcon } from "@/src/components/Icons";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import MissingPrerequisites from "../../products/components/MissingPrerequisites";
import { ProductSelectorDialog } from "../../products/components/ProductSelectorDialog";
import { useProductVariantOnboardingForm } from "../hooks/useProductVariantOnboardingForm";

const optionClassName = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

/**
 * Alta rápida de variante: producto + color + talla (solo PT) + precio base.
 *
 * NO se captura el SKU: lo genera el servidor (`CODIGO-COLOR[-TALLA]`). Se
 * muestra una vista previa ESTIMADA mientras se llena el formulario y, tras el
 * 201, el SKU real de la respuesta. Tampoco se capturan `nombre`, `empresa` ni
 * `activo` (el backend los resuelve o los ignora).
 */
export default function ProductVariantOnboardingForm() {
  const {
    form,
    formRef,
    isPending,
    isLoadingCatalogs,
    catalogsError,
    missingItems,
    activeProducts,
    colors,
    requiresTalla,
    sizeOptions,
    isLoadingSizes,
    skuPreview,
    selectedProductHasCode,
    selectedProductId,
    createdVariant,
    generalError,
    getError,
    clearFieldErrors,
    validateField,
    handleProductSelect,
    getProductLabel,
    handleReset,
    startAnother,
    handleFormSubmit,
  } = useProductVariantOnboardingForm();
  // Selector de producto apilado sobre este formulario (que sigue montado detrás).
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  if (catalogsError) {
    return (
      <ErrorState
        title="Error al cargar los catálogos"
        message={extractErrorMessage(catalogsError, "No se pudieron cargar productos y colores.")}
      />
    );
  }

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  if (createdVariant) {
    return (
      <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-emerald-200 dark:border-emerald-500/20 p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div className="space-y-4 min-w-0">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Variante registrada
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 break-words">
                {createdVariant.nombre || createdVariant.producto_nombre}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                SKU asignado
              </p>
              <p
                className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-300 break-all"
                data-testid="variant-onboarding-sku"
              >
                {createdVariant.sku}
              </p>
            </div>
          </div>
        </div>
        {/* Sin botón "Cerrar" propio: `MainDialog` ya trae el suyo en el pie. */}
        <div className="flex flex-col gap-3 mt-8 sm:flex-row sm:justify-end">
          <Button variant="primary" onClick={startAnother}>
            Registrar otra
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
        <fieldset disabled={isPending}>
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-8">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <ProductVariantsIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Alta rápida de variante
                </h3>
                <p className="text-xs text-slate-500">
                  El SKU se genera automáticamente a partir del producto, color y talla
                </p>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <form.Field name="producto">
                  {(field) => (
                    <ItemPickerButton
                      label="Producto"
                      placeholder={isLoadingCatalogs ? "Cargando..." : "Seleccionar producto..."}
                      selectedLabel={getProductLabel(field.state.value)}
                      onClick={() => setIsProductSelectorOpen(true)}
                      error={getError("producto")}
                      disabled={isPending || isLoadingCatalogs}
                    />
                  )}
                </form.Field>
              </div>

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
                      {isLoadingCatalogs ? "Cargando..." : "Seleccionar..."}
                    </option>
                    {colors.map((color) => (
                      <option key={color.id} value={color.id} className={optionClassName}>
                        {color.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              {/* Talla solo para productos PT (EC-252); para el resto no se
                  captura y se envía `null`. Las opciones salen de la categoría
                  del producto. */}
              {requiresTalla ? (
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
                        {isLoadingSizes
                          ? "Cargando..."
                          : sizeOptions.length === 0
                            ? "Sin tallas para la categoría del producto"
                            : "Seleccionar..."}
                      </option>
                      {sizeOptions.map((size) => (
                        <option key={size.id} value={size.id} className={optionClassName}>
                          {size.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              ) : null}

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

              <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  SKU estimado
                </p>
                <p
                  className="font-mono text-lg font-semibold text-slate-700 dark:text-slate-200 break-all"
                  data-testid="variant-onboarding-sku-preview"
                >
                  {skuPreview ?? "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedProductId > 0 && !selectedProductHasCode
                    ? "El producto no tiene código; el servidor no podrá generar el SKU."
                    : "Informativo: el SKU definitivo lo asigna el servidor al registrar."}
                </p>
              </div>
            </div>
          </section>

          {generalError ? (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-300/70 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-5 py-3 text-sm text-red-700 dark:text-red-200"
            >
              {generalError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-end">
            <FormCancelButton onClick={handleReset} disabled={isPending} />
            <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
              Registrar Variante
            </FormSubmitButton>
          </div>
        </fieldset>
      </form>

      {/* Fuera del `<form>`: el diálogo es un portal y no debe heredar su submit. */}
      <ProductSelectorDialog
        open={isProductSelectorOpen}
        onOpenChange={setIsProductSelectorOpen}
        products={activeProducts}
        selectedId={selectedProductId}
        onSelect={handleProductSelect}
      />
    </>
  );
}
