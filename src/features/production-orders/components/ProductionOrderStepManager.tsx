"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Asistente de 2 pasos para crear una orden de producción.
//   Paso 1 — Cabecera (prioridad y observaciones) + selección múltiple
//            de variantes de producto.
//   Paso 2 — Configuración por variante (cantidad, unidad y observaciones) de
//            cada renglón del detalle, previa a confirmar la creación. El
//            backend resuelve la lista de materiales (BOM) automáticamente.
// Mismo patrón que el asistente de listas de materiales (`BomStepManager`).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import { useProductVariants } from "@/src/features/product-variants/hooks/useProductVariants";
import type { ProductVariant } from "@/src/features/product-variants/interfaces/product-variant.interface";
import { useCreateProductionOrderForm } from "@/src/features/production-orders/hooks/useCreateProductionOrderForm";
import {
  ProductionOrderStep1,
  type ProductionOrderStep1Data,
} from "./ProductionOrderStep1";
import { ProductionOrderStep2 } from "./ProductionOrderStep2";

/** Pasos disponibles del asistente. */
export type ProductionOrderStep = "select-products" | "configure-products";

/** Lista ordenada de todos los pasos. */
const STEPS: readonly ProductionOrderStep[] = [
  "select-products",
  "configure-products",
];

/** Etiqueta legible de cada paso. */
const STEP_LABELS: Record<ProductionOrderStep, string> = {
  "select-products": "Seleccionar Productos",
  "configure-products": "Configurar Cantidades",
};

interface ProductionOrderStepManagerProps {
  /** Called when the wizard should close without completing (cancel / back). */
  onClose?: () => void;
  /** Called after the orden de producción is created successfully. */
  onSuccess: () => void;
}

/**
 * ProductionOrderStepManager
 *
 * Orquestador del asistente de creación de órdenes de producción. Mantiene el
 * paso actual y los datos capturados en el Paso 1, posee la instancia de
 * TanStack Form (compartida con el submit del Paso 2) y renderiza el componente
 * de paso correspondiente.
 */
export function ProductionOrderStepManager({
  onClose,
  onSuccess,
}: ProductionOrderStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<ProductionOrderStep>(STEPS[0]);
  const [step1Data, setStep1Data] = useState<ProductionOrderStep1Data | null>(
    null,
  );
  const [selectedVariants, setSelectedVariants] = useState<ProductVariant[]>(
    [],
  );

  // Catálogo de variantes (con BOM) — ya cacheado por el Paso 1, así que no
  // genera una petición adicional. Sirve para titular las tarjetas del Paso 2.
  const { productVariants } = useProductVariants(true);

  // El form vive en el step manager: el Paso 2 sólo dispara su submit vía
  // `onConfirm`. La cabecera y el detalle capturados en el Paso 1 se inyectan
  // al avanzar.
  const { form, isSubmitting, getError, clearError, seedDetalle } =
    useCreateProductionOrderForm({
      prioridad: step1Data?.prioridad ?? 0,
      observaciones: step1Data?.observaciones ?? "",
      selectedVariantIds: step1Data?.variantIds ?? [],
      onSuccess,
    });

  /** Paso 1 → vuelca la cabecera + siembra el detalle y avanza a configurar. */
  const handleProductsSelected = useCallback(
    (data: ProductionOrderStep1Data) => {
      setStep1Data(data);
      setSelectedVariants(
        productVariants.filter((variant) =>
          data.variantIds.includes(variant.id),
        ),
      );
      form.setFieldValue("prioridad", data.prioridad);
      form.setFieldValue("observaciones", data.observaciones);
      seedDetalle(data.variantIds);
      setCurrentStep("configure-products");
    },
    [form, productVariants, seedDetalle],
  );

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={STEPS}
        currentStep={currentStep}
        labels={STEP_LABELS}
      />

      {/* Step content */}
      <div>
        {currentStep === "select-products" && (
          <ProductionOrderStep1
            initialData={step1Data}
            onNext={handleProductsSelected}
            onBack={() => onClose?.()}
          />
        )}

        {currentStep === "configure-products" && step1Data && (
          <ProductionOrderStep2
            selectedVariants={selectedVariants}
            form={form}
            getError={getError}
            clearError={clearError}
            onBack={() => setCurrentStep("select-products")}
            onConfirm={() => void form.handleSubmit()}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
