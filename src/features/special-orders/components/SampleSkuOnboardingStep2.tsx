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
import { useNextCatalogProductCode } from "../hooks/useNextCatalogProductCode";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type { SampleSkuOnboardingForm } from "../hooks/useSampleSkuOnboardingForm";
import { CATALOG_ALTA_DEVIATION, catalogAltaDeviates } from "../utils/catalogAlta";

/** Mismo ámbar que el aviso de "SKU incompletos" de la tarjeta. */
const CATALOG_WARNING_TEXT = "text-amber-700 dark:text-amber-400";

interface SampleSkuOnboardingStep2Props {
  onboarding: SampleSkuOnboardingForm;
  /** Regresa al Paso 1 (los valores capturados se conservan en el formulario). */
  onBack: () => void;
}

/**
 * Paso 2 del alta de SKU de muestra: consumo de cada material elegido.
 *
 * Una FILA por material (se captura de corrido con Tab): `cantidad` (por
 * pieza), `unidad` (fija si el material ya la trae), `desperdicio` (%) y
 * `obligatorio`. Lo capturado aquí se envía UNA vez y el backend lo
 * replica en la lista de materiales de cada talla, por eso el resumen final
 * dice cuántos SKU se van a crear y cuál será el de cada talla
 * (`getSampleSkuPreview`). Si el alta fallaría con seguridad por un color sin
 * código, se avisa y no se deja enviar.
 *
 * Los decimales son inputs de TEXTO saneados a 2 posiciones
 * (`sanitizeDecimalInput`), no `type="number"`: así lo escrito es exactamente
 * lo que se valida y se envía.
 */
export function SampleSkuOnboardingStep2({
  onboarding,
  onBack,
}: SampleSkuOnboardingStep2Props) {
  const {
    form,
    skuPreview,
    catalogAlta,
    isSubmitting,
    formError,
    getError,
    clearError,
    handleFormSubmit,
  } = onboarding;

  // Mismo `useProducts(2)` que `BomStep1`: comparte caché, no vuelve a pedir.
  const { products, isLoading: isLoadingProducts } = useProducts(2);
  const { units, isLoading: isLoadingUnits, isInitialError: isErrorUnits } = useUnitsOfMeasure();

  if (isLoadingProducts || isLoadingUnits) {
    return <Loader title="Preparando configuración" message="Cargando catálogos..." />;
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const activeUnits = units.filter((unit) => unit.activo);
  // El backend crea un SKU por cada talla con cantidad (> 0): son las filas de la vista previa.
  const totalSkus = skuPreview.rows.length;

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

      <div className="rounded-2xl border border-slate-200 dark:border-white/10">
        {/* Una fila por material, para capturar de corrido con Tab. */}
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_7rem_6.5rem_5.5rem_3.5rem] gap-3 border-b border-slate-200 dark:border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>Material</span>
          <span className="text-right">Por pieza</span>
          <span>Unidad</span>
          <span className="text-right">Desp. %</span>
          <span className="text-center">Oblig.</span>
        </div>
        <div className="max-h-88 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          <form.Field name="materia_prima_detalle" mode="array">
            {(arrayField) =>
              arrayField.state.value.map((item, index) => {
                const rowError = getError(`materia_prima_detalle.${index}`);
                const product = productById.get(item.componente);
                // Con unidad en el catálogo, el backend la toma: no se elige.
                const fixedUnitId = product?.unidad_id ?? null;
                const fixedUnitLabel =
                  product?.unidad_abreviatura ||
                  product?.unidad_nombre ||
                  (fixedUnitId ? unitById.get(fixedUnitId)?.clave : undefined);
                const name = product?.nombre ?? `Material #${item.componente}`;
                return (
                  <div
                    key={item.componente}
                    className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_7rem_6.5rem_5.5rem_3.5rem] items-center gap-3 px-4 py-3"
                  >
                    <div className="col-span-2 sm:col-span-1 min-w-0">
                      <p
                        className="text-sm font-semibold text-slate-800 dark:text-white truncate"
                        title={name}
                      >
                        {name}
                      </p>
                      {product?.codigo && (
                        <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {product.codigo}
                        </p>
                      )}
                      {rowError && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{rowError.message}</p>
                      )}
                    </div>

                    <form.Field name={`materia_prima_detalle[${index}].cantidad`}>
                      {(field) => (
                        <FormInput
                          aria-label={`Cantidad por pieza de ${name}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="tabular-nums text-right"
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
                      {(field) =>
                        fixedUnitId && field.state.value === fixedUnitId ? (
                          // La unidad viene del material: no se elige, así no hay error posible.
                          <p
                            className="flex min-h-11 items-center text-sm font-medium text-slate-700 dark:text-slate-200"
                            title={`${product?.unidad_nombre ?? fixedUnitLabel} (unidad del material)`}
                          >
                            {fixedUnitLabel}
                          </p>
                        ) : (
                          <FormSelect
                            aria-label={`Unidad de ${name}`}
                            name={field.name}
                            value={field.state.value}
                            onChange={(event) => {
                              field.handleChange(Number(event.target.value) || 0);
                              clearError(`materia_prima_detalle.${index}.unidad`);
                            }}
                            error={getError(`materia_prima_detalle.${index}.unidad`)}
                          >
                            <option value="0" disabled>
                              Elegir
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
                        )
                      }
                    </form.Field>

                    <form.Field name={`materia_prima_detalle[${index}].desperdicio`}>
                      {(field) => (
                        <FormInput
                          aria-label={`Desperdicio (%) de ${name}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          className="tabular-nums text-right"
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
                        <label className="flex min-h-11 items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            name={field.name}
                            checked={field.state.value}
                            onChange={(event) => field.handleChange(event.target.checked)}
                            aria-label={`${name}: obligatorio`}
                            className="h-4 w-4 accent-sky-600 cursor-pointer"
                          />
                          <span className="sm:hidden">Obligatorio</span>
                        </label>
                      )}
                    </form.Field>
                  </div>
                );
              })
            }
          </form.Field>
        </div>
        <p className="border-t border-slate-200 dark:border-white/10 px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400">
          Cantidad por pieza, en la unidad de inventario del material.
        </p>
      </div>

      <form.Field name="alta_catalogo">
        {(field) => {
          // Sin categoría se ve desmarcada y fija aunque un refetch la haya
          // bloqueado después de marcarla: así es como se enviará.
          const editable = catalogAlta.kind === "editable" ? catalogAlta : null;
          const checked = editable !== null && field.state.value;
          const inherited = editable?.inherited ?? null;
          const deviates = catalogAltaDeviates(catalogAlta, field.state.value);
          const showCodePreview = editable !== null && checked && !inherited?.hasCatalogProduct;
          return (
            <div>
              <FormToggle
                label="Catálogo"
                description="Dar de alta en catálogo"
                name={field.name}
                checked={checked}
                disabled={editable === null || isSubmitting}
                title={catalogAlta.kind === "blocked" ? catalogAlta.reason : undefined}
                aria-describedby="sample-sku-catalog-hint"
                className={editable === null ? "opacity-60 cursor-not-allowed!" : ""}
                onChange={(event) => field.handleChange(event.target.checked)}
              />
              <div
                id="sample-sku-catalog-hint"
                className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 ml-1 space-y-0.5"
              >
                {catalogAlta.kind === "blocked" ? (
                  <p>{catalogAlta.reason}</p>
                ) : inherited ? (
                  <p className={inherited.mixed ? CATALOG_WARNING_TEXT : undefined}>
                    {inherited.reason}
                  </p>
                ) : null}
                {deviates && <p className={CATALOG_WARNING_TEXT}>{CATALOG_ALTA_DEVIATION}</p>}
                {showCodePreview ? (
                  <p>
                    <CatalogCodePreview categoriaId={editable.categoriaId} />
                  </p>
                ) : (
                  editable !== null &&
                  inherited === null && (
                    <p>
                      Crea también el producto y una variante por talla en el catálogo, con la
                      categoría de la línea, para que tenga existencias y se venda como un producto
                      normal.
                    </p>
                  )
                )}
              </div>
            </div>
          );
        }}
      </form.Field>

      <div className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-3 text-xs text-sky-900 dark:text-sky-100 space-y-1">
        <p className="font-semibold">
          {totalSkus === 1
            ? "Se creará 1 SKU de producción, para la talla con cantidad:"
            : `Se crearán ${totalSkus} SKU de producción, uno por talla con cantidad:`}
        </p>
        <ul className="space-y-0.5">
          {skuPreview.rows.map(({ talla, sku }) => (
            <li key={talla.id} className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
              <span>
                {talla.talla_nombre || "—"} ({formatQuantityValue(talla.cantidad)})
              </span>
              <span aria-hidden="true">→</span>
              {sku ? (
                <span className="font-semibold break-all">{sku}</span>
              ) : (
                <span className="text-sky-800/70 dark:text-sky-200/70">
                  {skuPreview.missingSkuHint}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-sky-800/80 dark:text-sky-200/80">
          Los mismos materiales se copian a la lista de materiales de cada SKU. Un SKU ya generado no
          se vuelve a generar.
        </p>
      </div>

      {skuPreview.blocker && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20 px-4 py-3"
        >
          <WarningFilledIcon className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {skuPreview.blocker}
          </p>
        </div>
      )}

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
          disabled={isErrorUnits || skuPreview.blocker !== null}
        >
          Generar SKU y BOM
        </FormSubmitButton>
      </div>
    </form>
  );
}

/**
 * Código del producto de catálogo que se crearía. Se monta solo con la casilla
 * marcada, así que cada vez que se marca vuelve a pedirse. Es orientativo: el
 * backend no lo reserva.
 */
function CatalogCodePreview({ categoriaId }: { categoriaId: number }) {
  const { codigo, isLoading, isInitialError } = useNextCatalogProductCode(categoriaId);

  if (isLoading) return <>Calculando el código del producto de catálogo...</>;
  if (isInitialError || !codigo) {
    return <>No se pudo obtener el código del producto de catálogo; se asignará al crear.</>;
  }
  return (
    <>
      Código de producto (orientativo):{" "}
      <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
        {codigo}
      </span>
      . El definitivo se asigna al crear y puede cambiar si antes se da de alta otro producto de
      la misma categoría.
    </>
  );
}
