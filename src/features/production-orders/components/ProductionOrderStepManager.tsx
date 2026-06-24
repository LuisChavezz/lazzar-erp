"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Asistente de 2 pasos para crear una orden de producción.
//   Paso 1 — Cabecera (prioridad, pedido y observaciones) + selección múltiple
//            de variantes de producto.
//   Paso 2 — Configurar cada renglón (BOM, cantidad, unidad y observaciones)
//            en tarjetas apiladas.
// Mismo patrón que el asistente de listas de materiales (`BomStepManager`).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
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
  "configure-products": "Configurar Productos",
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
 * paso actual y los datos capturados en el Paso 1, y renderiza el componente de
 * paso correspondiente.
 */
export function ProductionOrderStepManager({
  onClose,
  onSuccess,
}: ProductionOrderStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<ProductionOrderStep>(STEPS[0]);
  const [step1Data, setStep1Data] = useState<ProductionOrderStep1Data | null>(
    null,
  );

  /** Paso 1 → guarda la cabecera y las variantes, y avanza a configuración. */
  const handleProductsSelected = useCallback(
    (data: ProductionOrderStep1Data) => {
      setStep1Data(data);
      setCurrentStep("configure-products");
    },
    [],
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
            step1Data={step1Data}
            onBack={() => setCurrentStep("select-products")}
            onSuccess={onSuccess}
          />
        )}
      </div>
    </div>
  );
}
