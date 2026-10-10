"use client";

import { ArrowLeft } from "lucide-react";
import { Loader } from "@/src/components/Loader";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormToggle } from "@/src/components/FormToggle";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { WarningFilledIcon } from "@/src/components/Icons";
import { useProducts } from "@/src/features/products/hooks/useProducts";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type { SpecialOrderLine } from "../interfaces/special-order.interface";
import type { SampleSkuOnboardingForm } from "../hooks/useSampleSkuOnboardingForm";

interface SampleSkuOnboardingStep2Props {
  line: SpecialOrderLine;
  onboarding: SampleSkuOnboardingForm;
  /** Regresa al Paso 1 (los valores capturados se conservan en el formulario). */
  onBack: () => void;
}

/**
 * Paso 2 del alta de SKU de muestra: consumo de cada material elegido.
 *
 * Un renglón por material con `cantidad` (por pieza), `unidad`, `desperdicio`
 * (%) y `obligatorio`. Lo capturado aquí se envía UNA vez y el backend lo
 * replica en la lista de materiales de cada talla, por eso el resumen final
 * dice cuántos SKU se van a crear y para qué tallas.
 *
 * Los decimales son inputs de TEXTO saneados a 2 posiciones
 * (`sanitizeDecimalInput`), no `type="number"`: así lo escrito es exactamente
 * lo que se valida y se envía.
 */
export function SampleSkuOnboardingStep2({
  line,
  onboarding,
  onBack,
}: SampleSkuOnboardingStep2Props) {
  const { form, isSubmitting, formError, getError, clearError, handleFormSubmit } = onboarding;

  // Mismo `useProducts(2)` que `BomStep1`: comparte caché, no vuelve a pedir.
  const { products, isLoading: isLoadingProducts } = useProducts(2);
  const { units, isLoading: isLoadingUnits, isInitialError: isErrorUnits } = useUnitsOfMeasure();

  if (isLoadingProducts || isLoadingUnits) {
    return <Loader title="Preparando configuración" message="Cargando catálogos..." />;
  }

  const productNameById = new Map(products.map((product) => [product.id, product.nombre]));
  const activeUnits = units.filter((unit) => unit.activo);
  // El backend crea un SKU por cada talla con cantidad (> 0).
  const tallasConCantidad = line.tallas.filter((talla) => Number(talla.cantidad) > 0);

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20 px-4 py-3"
        >
          <WarningFilledIcon
            className="w-5 h-5 shrink-0 text-rose-500 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{formError}</p>
        </div>
      )}

      {isErrorUnits && (
        <p role="alert" className="text-sm text-red-500">
          No se pudieron cargar las unidades de medida. Cierra el diálogo e inténtalo de nuevo.
        </p>
      )}

      <div className="flex flex-col gap-4 max-h-88 overflow-y-auto pr-1">
        <form.Field name="materia_prima_detalle" mode="array">
          {(arrayField) =>
            arrayField.state.value.map((item, index) => {
              const rowError = getError(`materia_prima_detalle.${index}`);
              return (
                <div
                  key={item.componente}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 text-xs font-bold text-sky-700 dark:text-sky-300">
                        {index + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {productNameById.get(item.componente) ?? `Material #${item.componente}`}
                      </h4>
                    </div>
                    {rowError && (
                      <p className="text-xs text-red-600 mt-1 font-medium">{rowError.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <form.Field name={`materia_prima_detalle[${index}].cantidad`}>
                      {(field) => (
                        <FormInput
                          label="Cantidad por pieza"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="tabular-nums"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                            clearError(`materia_prima_detalle.${index}.cantidad`);
                          }}
                          error={getError(`materia_prima_detalle.${index}.cantidad`)}
                        />
                      )}
                    </form.Field>

                    <form.Field name={`materia_prima_detalle[${index}].unidad`}>
                      {(field) => (
                        <div>
                          <FormSelect
                            label="Unidad"
                            name={field.name}
                            value={field.state.value}
                            onChange={(event) => {
                              field.handleChange(Number(event.target.value) || 0);
                              clearError(`materia_prima_detalle.${index}.unidad`);
                            }}
                            error={getError(`materia_prima_detalle.${index}.unidad`)}
                          >
                            <option value="0" disabled>
                              Seleccionar...
                            </option>
                            {activeUnits.map((unit) => (
                              <option
                                key={unit.id}
                                value={unit.id}
                                className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                              >
                                {unit.clave} — {unit.nombre}
                              </option>
                            ))}
                          </FormSelect>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 ml-1">
                            La cantidad debe estar en la unidad de inventario del material.
                          </p>
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`materia_prima_detalle[${index}].desperdicio`}>
                      {(field) => (
                        <FormInput
                          label="Desperdicio (%)"
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          className="tabular-nums"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                            clearError(`materia_prima_detalle.${index}.desperdicio`);
                          }}
                          error={getError(`materia_prima_detalle.${index}.desperdicio`)}
                        />
                      )}
                    </form.Field>

                    <form.Field name={`materia_prima_detalle[${index}].obligatorio`}>
                      {(field) => (
                        <FormToggle
                          label="Obligatorio"
                          description={
                            field.state.value ? "Material obligatorio" : "Material opcional"
                          }
                          name={field.name}
                          checked={field.state.value}
                          onChange={(event) => field.handleChange(event.target.checked)}
                          error={getError(`materia_prima_detalle.${index}.obligatorio`)}
                        />
                      )}
                    </form.Field>
                  </div>
                </div>
              );
            })
          }
        </form.Field>
      </div>

      <div className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-3 text-xs text-sky-900 dark:text-sky-100 space-y-1">
        <p className="font-semibold">
          {tallasConCantidad.length === 1
            ? "Se creará 1 SKU de producción, para la talla con cantidad:"
            : `Se crearán ${tallasConCantidad.length} SKU de producción, uno por talla con cantidad:`}
        </p>
        <p className="tabular-nums">
          {tallasConCantidad
            .map((talla) => `${talla.talla_nombre} (${formatQuantityValue(talla.cantidad)})`)
            .join(", ")}
        </p>
        <p className="text-sky-800/80 dark:text-sky-200/80">
          Los mismos materiales se copian a la lista de materiales de cada SKU. Una vez generados no
          se pueden volver a generar para esta línea.
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer bg-transparent border-none p-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </button>

        <FormSubmitButton
          isPending={isSubmitting}
          loadingLabel="Generando..."
          disabled={isErrorUnits}
        >
          Generar SKU y BOM
        </FormSubmitButton>
      </div>
    </form>
  );
}
