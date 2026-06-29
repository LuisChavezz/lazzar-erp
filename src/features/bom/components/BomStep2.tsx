"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Loader } from "@/src/components/Loader";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormToggle } from "@/src/components/FormToggle";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { useProducts } from "@/src/features/products/hooks/useProducts";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import { useCreateBomForm } from "@/src/features/bom/hooks/useCreateBomForm";

interface BomStep2Props {
  /** Variante de producto (recibida desde el diálogo). */
  productoVarianteId: number;
  /** Product ids selected in Step 1 — one config card each. */
  componentIds: number[];
  /** Returns to Step 1. */
  onBack: () => void;
  /** Called after the lista de materiales is created — closes the dialog. */
  onSuccess: () => void;
}

/** Parses an input string into a number, falling back to 0. */
function toNumber(raw: string): number {
  if (raw === "") return 0;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * BomStep2
 *
 * Step 2 of the BOM onboarding flow. Renders one configuration card per product
 * selected in Step 1 (stacked, scrollable) with the four per-item fields:
 * cantidad, unidad, obligatorio y observaciones. All inputs are
 * controlled through TanStack Form (see {@link useCreateBomForm}); the final
 * button submits and validates the whole lista against the Zod schema.
 */
export function BomStep2({
  productoVarianteId,
  componentIds,
  onBack,
  onSuccess,
}: BomStep2Props) {
  const { form, isSubmitting, getError, clearError, handleFormSubmit } =
    useCreateBomForm({ productoVarianteId, componentIds, onSuccess });

  const { products, isLoading: isLoadingProducts } = useProducts(2);
  const { units, isLoading: isLoadingUnits } = useUnitsOfMeasure();

  // Mapa id → nombre para titular cada tarjeta de material.
  const productNameById = useMemo(() => {
    const map = new Map<number, string>();
    products.forEach((product) => map.set(product.id, product.nombre));
    return map;
  }, [products]);

  if (isLoadingProducts || isLoadingUnits) {
    return (
      <Loader
        title="Preparando configuración"
        message="Cargando catálogos..."
      />
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
      {/* Observaciones generales de la lista */}
      <form.Field name="observaciones">
        {(field) => (
          <FormTextarea
            label="Observaciones generales"
            placeholder="Notas para toda la lista de materiales (opcional)"
            rows={2}
            name={field.name}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>

      {/* Una tarjeta de configuración por material seleccionado */}
      <div className="flex flex-col gap-4 max-h-88 overflow-y-auto pr-1">
        <form.Field name="materia_prima_detalle" mode="array">
          {(arrayField) =>
            arrayField.state.value.map((item, index) => (
              <div
                key={`${item.componente}-${index}`}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-4"
              >
                {/* Encabezado: nombre del producto */}
                <div className="flex items-center gap-2">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 text-xs font-bold text-sky-700 dark:text-sky-300">
                    {index + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {productNameById.get(item.componente) ??
                      `Componente #${item.componente}`}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cantidad */}
                  <form.Field name={`materia_prima_detalle[${index}].cantidad`}>
                    {(field) => (
                      <FormInput
                        label="Cantidad"
                        type="number"
                        step="any"
                        min={0}
                        inputMode="decimal"
                        placeholder="0"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(toNumber(event.target.value));
                          clearError(`materia_prima_detalle.${index}.cantidad`);
                        }}
                        error={getError(
                          `materia_prima_detalle.${index}.cantidad`,
                        )}
                      />
                    )}
                  </form.Field>

                  {/* Unidad */}
                  <form.Field name={`materia_prima_detalle[${index}].unidad`}>
                    {(field) => (
                      <FormSelect
                        label="Unidad"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(toNumber(event.target.value));
                          clearError(`materia_prima_detalle.${index}.unidad`);
                        }}
                        error={getError(
                          `materia_prima_detalle.${index}.unidad`,
                        )}
                      >
                        <option value="0" disabled>
                          Seleccionar...
                        </option>
                        {units.map((unit) => (
                          <option
                            key={unit.id}
                            value={unit.id}
                            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                          >
                            {unit.clave} — {unit.nombre}
                          </option>
                        ))}
                      </FormSelect>
                    )}
                  </form.Field>

                  {/* Obligatorio */}
                  <form.Field
                    name={`materia_prima_detalle[${index}].obligatorio`}
                  >
                    {(field) => (
                      <FormToggle
                        label="Obligatorio"
                        description={
                          field.state.value
                            ? "Material obligatorio"
                            : "Material opcional"
                        }
                        name={field.name}
                        checked={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.checked)
                        }
                      />
                    )}
                  </form.Field>
                </div>

                {/* Observaciones por material */}
                <form.Field
                  name={`materia_prima_detalle[${index}].observaciones`}
                >
                  {(field) => (
                    <FormTextarea
                      label="Observaciones"
                      placeholder="Notas para este material (opcional)"
                      rows={2}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
            ))
          }
        </form.Field>
      </div>

      {/* Action bar */}
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

        <FormSubmitButton isPending={isSubmitting} loadingLabel="Creando...">
          Crear lista de materiales
        </FormSubmitButton>
      </div>
    </form>
  );
}
