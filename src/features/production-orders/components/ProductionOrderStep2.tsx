"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Loader } from "@/src/components/Loader";
import { useBomBulk } from "@/src/features/bom/hooks/useBomBulk";
import type { BomBulkItem } from "@/src/features/bom/interfaces/bom.interface";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSubmitButton } from "@/src/components/FormButtons";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import type { ProductVariant } from "@/src/features/product-variants/interfaces/product-variant.interface";
import type { CreateProductionOrderFormApi } from "@/src/features/production-orders/hooks/useCreateProductionOrderForm";

interface ProductionOrderStep2Props {
  /** Variantes seleccionadas en el Paso 1 — para titular cada tarjeta. */
  selectedVariants: ProductVariant[];
  /** Instancia de TanStack Form (vive en el step manager). */
  form: CreateProductionOrderFormApi;
  /** Devuelve el error de un campo por ruta (p. ej. `...0.unidad`). */
  getError: (path: string) => FormFieldError | undefined;
  /** Limpia el error de un campo cuando cambia su valor. */
  clearError: (path: string) => void;
  /** Regresa al Paso 1. */
  onBack: () => void;
  /** Dispara el submit del formulario (POST). */
  onConfirm: () => void;
  /** Indica que la creación está en curso. */
  isSubmitting: boolean;
}

/** Convierte el value de un input a número, con 0 como respaldo. */
function toNumber(raw: string): number {
  if (raw === "") return 0;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function BomMaterialsSection({
  bomItem,
  isLoading,
}: {
  bomItem: BomBulkItem | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const detalles = bomItem?.detalles ?? [];

  if (detalles.length === 0) {
    return (
      <p className="text-xs italic text-slate-400 dark:text-slate-500">
        Sin materiales registrados
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 dark:text-slate-500">
            <th className="pb-1.5 text-left font-medium">Componente</th>
            <th className="pb-1.5 text-right font-medium">Cantidad</th>
            <th className="pb-1.5 text-right font-medium">Unidad</th>
            <th className="pb-1.5 text-right font-medium">Desperdicio</th>
            <th className="pb-1.5 text-right font-medium">Obligatorio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {detalles.map((detalle) => (
            <tr key={detalle.bom_detalle_id}>
              <td className="max-w-[140px] truncate py-1.5 pr-3 text-slate-700 dark:text-slate-300">
                {detalle.componente_nombre}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-slate-600 dark:text-slate-400">
                {detalle.cantidad}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-slate-600 dark:text-slate-400">
                {detalle.unidad_clave}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-slate-600 dark:text-slate-400">
                {detalle.desperdicio}
              </td>
              <td className="py-1.5 text-right">
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    detalle.obligatorio
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  }`}
                >
                  {detalle.obligatorio ? "Sí" : "No"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ProductionOrderStep2
 *
 * Paso 2 del asistente de orden de producción. Renderiza una tarjeta de
 * configuración por variante elegida en el Paso 1 (apiladas, desplazables) con
 * los campos editables del detalle: cantidad, unidad de medida y observaciones.
 * Debajo de cada tarjeta se muestra la lista de materiales (BOM) de la variante,
 * obtenida con {@link useBomBulk} — sólo lectura. El submit lo dispara `onConfirm`.
 */
export function ProductionOrderStep2({
  selectedVariants,
  form,
  getError,
  clearError,
  onBack,
  onConfirm,
  isSubmitting,
}: ProductionOrderStep2Props) {
  const { units, isLoading: isLoadingUnits } = useUnitsOfMeasure();

  // Mapa id → variante para titular cada tarjeta por su `producto_variante_id`.
  const variantById = useMemo(() => {
    const map = new Map<number, ProductVariant>();
    selectedVariants.forEach((variant) => map.set(variant.id, variant));
    return map;
  }, [selectedVariants]);

  const selectedVariantIds = useMemo(
    () => selectedVariants.map((v) => v.id),
    [selectedVariants],
  );

  const { data: bomData, isLoading: isLoadingBom } =
    useBomBulk(selectedVariantIds);

  const bomByVariantId = useMemo(() => {
    const map = new Map<number, BomBulkItem>();
    (bomData ?? []).forEach((item) =>
      map.set(item.producto_variante_id, item),
    );
    return map;
  }, [bomData]);

  // ── Loading state ─────────────────────────────────────────────────────
  // Espera al catálogo de unidades antes de mostrar el formulario (y, con él,
  // el botón "Crear Orden"), evitando un select de unidades vacío.
  if (isLoadingUnits) {
    return (
      <Loader
        title="Preparando configuración"
        message="Cargando unidades de medida..."
      />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onConfirm();
      }}
      className="flex flex-col gap-5"
    >
      {/* Una tarjeta de configuración por variante seleccionada */}
      <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1">
        <form.Field name="orden_produccion_detalle" mode="array">
          {(arrayField) =>
            arrayField.state.value.map((item, index) => {
              const variant = variantById.get(item.producto_variante_id);
              return (
                <div
                  key={`${item.producto_variante_id}-${index}`}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-4"
                >
                  {/* Encabezado de la variante (solo lectura) */}
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 text-xs font-bold text-sky-700 dark:text-sky-300">
                      {index + 1}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {variant?.nombre ??
                        `Variante #${item.producto_variante_id}`}
                    </h4>
                    {variant?.sku && (
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                        {variant.sku}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Cantidad */}
                    <form.Field
                      name={`orden_produccion_detalle[${index}].cantidad`}
                    >
                      {(field) => (
                        <FormInput
                          label="Cantidad"
                          type="number"
                          step="any"
                          min={1}
                          inputMode="decimal"
                          placeholder="0"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(toNumber(event.target.value));
                            clearError(
                              `orden_produccion_detalle.${index}.cantidad`,
                            );
                          }}
                          error={getError(
                            `orden_produccion_detalle.${index}.cantidad`,
                          )}
                        />
                      )}
                    </form.Field>

                    {/* Unidad de medida */}
                    <form.Field
                      name={`orden_produccion_detalle[${index}].unidad`}
                    >
                      {(field) => (
                        <FormSelect
                          label="Unidad de medida"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(toNumber(event.target.value));
                            clearError(
                              `orden_produccion_detalle.${index}.unidad`,
                            );
                          }}
                          error={getError(
                            `orden_produccion_detalle.${index}.unidad`,
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
                  </div>

                  {/* Observaciones por variante */}
                  <form.Field
                    name={`orden_produccion_detalle[${index}].observaciones`}
                  >
                    {(field) => (
                      <FormTextarea
                        label="Observaciones"
                        placeholder="Notas para este producto (opcional)"
                        rows={2}
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    )}
                  </form.Field>

                  {/* BOM materials — read-only context */}
                  <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                    <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Materiales
                    </h5>
                    <BomMaterialsSection
                      bomItem={bomByVariantId.get(item.producto_variante_id)}
                      isLoading={isLoadingBom}
                    />
                  </div>
                </div>
              );
            })
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
          Crear Orden
        </FormSubmitButton>
      </div>
    </form>
  );
}
