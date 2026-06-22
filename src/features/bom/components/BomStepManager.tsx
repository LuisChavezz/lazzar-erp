"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Decisión de diseño (Opción B — Paso 2 + Paso 3)
//
// Cada material requiere 5 campos (cantidad, unidad, desperdicio, obligatorio y
// observaciones). Configurarlos en línea junto al selector (Opción A) satura la
// pantalla al elegir varios productos. Esta app ya favorece los asistentes
// multi-paso (la orden de compra usa 3 pasos) y separar "seleccionar" de
// "configurar" hace la validación por ítem más clara. Por eso:
//   Paso 1 — Seleccionar la variante de producto.
//   Paso 2 — Selección múltiple de materiales (solo elegir qué productos).
//   Paso 3 — Configurar los 5 campos de cada material (tarjetas apiladas).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import type { ProductVariant } from "@/src/features/product-variants/interfaces/product-variant.interface";
import { SelectVariantStep } from "./SelectVariantStep";
import { BomStep2 } from "./BomStep2";
import { BomStep3 } from "./BomStep3";

/** Available onboarding steps. */
export type BomStep =
  | "select-variant"
  | "select-materials"
  | "configure-materials";

/** Ordered list of all steps. */
const STEPS: readonly BomStep[] = [
  "select-variant",
  "select-materials",
  "configure-materials",
];

/** Human-readable label for each step. */
const STEP_LABELS: Record<BomStep, string> = {
  "select-variant": "Seleccionar Variante",
  "select-materials": "Seleccionar Materiales",
  "configure-materials": "Configurar Materiales",
};

interface BomStepManagerProps {
  /** Called when the flow completes (lista creada) and the dialog should close. */
  onClose?: () => void;
}

/**
 * BomStepManager
 *
 * Orchestrator for the BOM (lista de materiales) onboarding wizard. Holds the
 * current step, the variant chosen in Step 1, and the component ids chosen in
 * Step 2, and renders the matching step component.
 */
export function BomStepManager({ onClose }: BomStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<BomStep>(STEPS[0]);
  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariant | null>(null);
  const [selectedComponentIds, setSelectedComponentIds] = useState<number[]>(
    [],
  );

  /** Step 1 → store the variant and advance to material selection. */
  const handleVariantSelected = useCallback((variant: ProductVariant) => {
    setSelectedVariant(variant);
    setCurrentStep("select-materials");
  }, []);

  /** Step 2 → store the selected component ids and advance to configuration. */
  const handleMaterialsSelected = useCallback((componentIds: number[]) => {
    setSelectedComponentIds(componentIds);
    setCurrentStep("configure-materials");
  }, []);

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={STEPS}
        currentStep={currentStep}
        labels={STEP_LABELS}
      />

      {/* Step content */}
      <div>
        {currentStep === "select-variant" && (
          <SelectVariantStep onNext={handleVariantSelected} />
        )}

        {currentStep === "select-materials" && (
          <BomStep2
            onNext={handleMaterialsSelected}
            onBack={() => setCurrentStep("select-variant")}
          />
        )}

        {currentStep === "configure-materials" && selectedVariant !== null && (
          <BomStep3
            productoVarianteId={selectedVariant.id}
            componentIds={selectedComponentIds}
            onBack={() => setCurrentStep("select-materials")}
            onSuccess={() => onClose?.()}
          />
        )}
      </div>
    </div>
  );
}
