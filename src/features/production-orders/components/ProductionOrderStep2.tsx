"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Loader } from "@/src/components/Loader";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { useProductVariants } from "@/src/features/product-variants/hooks/useProductVariants";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import { useCreateProductionOrderForm } from "@/src/features/production-orders/hooks/useCreateProductionOrderForm";
import { ProductionOrderDetalleCard } from "./ProductionOrderDetalleCard";
import type { ProductionOrderStep1Data } from "./ProductionOrderStep1";

interface ProductionOrderStep2Props {
  /** Datos de cabecera + variantes capturados en el Paso 1. */
  step1Data: ProductionOrderStep1Data;
  /** Regresa al Paso 1. */
  onBack: () => void;
  /** Called after the orden de producción is created — closes the dialog. */
  onSuccess: () => void;
}

/**
 * ProductionOrderStep2
 *
 * Paso 2 del asistente de orden de producción. Renderiza una tarjeta de
 * configuración por variante seleccionada en el Paso 1 (apiladas, con scroll):
 * lista de materiales (BOM), cantidad, unidad y observaciones. Todas las
 * entradas se controlan con TanStack Form (ver
 * {@link useCreateProductionOrderForm}); el botón final envía y valida toda la
 * orden contra el esquema Zod.
 */
export function ProductionOrderStep2({
  step1Data,
  onBack,
  onSuccess,
}: ProductionOrderStep2Props) {
  const { form, isSubmitting, getError, clearError, handleFormSubmit } =
    useCreateProductionOrderForm({
      prioridad: step1Data.prioridad,
      pedido: step1Data.pedido,
      observaciones: step1Data.observaciones,
      variantIds: step1Data.variantIds,
      onSuccess,
    });

  const { productVariants, isLoading: isLoadingVariants } =
    useProductVariants();
  const { units, isLoading: isLoadingUnits } = useUnitsOfMeasure();

  // Mapa id → nombre para titular cada tarjeta de variante.
  const variantNameById = useMemo(() => {
    const map = new Map<number, string>();
    productVariants.forEach((variant) => map.set(variant.id, variant.nombre));
    return map;
  }, [productVariants]);

  if (isLoadingVariants || isLoadingUnits) {
    return (
      <Loader
        title="Preparando configuración"
        message="Cargando catálogos..."
      />
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
      {/* Una tarjeta de configuración por variante seleccionada */}
      <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1">
        <form.Field name="orden_produccion_detalle" mode="array">
          {(arrayField) =>
            arrayField.state.value.map((item, index) => (
              <ProductionOrderDetalleCard
                key={`${item.producto_variante_id}-${index}`}
                variantId={item.producto_variante_id}
                index={index}
                form={form}
                units={units}
                variantLabel={
                  variantNameById.get(item.producto_variante_id) ??
                  `Variante #${item.producto_variante_id}`
                }
                getError={getError}
                clearError={clearError}
              />
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

        <FormSubmitButton
          isPending={isSubmitting}
          loadingLabel="Creando..."
          disabled={step1Data.variantIds.length === 0}
        >
          Crear orden de producción
        </FormSubmitButton>
      </div>
    </form>
  );
}
