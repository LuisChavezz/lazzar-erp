"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Decisión de diseño (asistente de 2 pasos)
//
// La variante de producto ya se conoce al abrir el asistente (se lanza desde el
// diálogo "Lista de Materiales" de una variante), por lo que ya no se selecciona
// aquí. Cada material requiere 4 campos (cantidad, unidad, obligatorio
// y observaciones); configurarlos en línea junto al selector satura
// la pantalla al elegir varios productos. Por eso el flujo separa "seleccionar"
// de "configurar":
//   Paso 1 — Selección múltiple de materiales (solo elegir qué productos).
//   Paso 2 — Configurar los 4 campos de cada material (tarjetas apiladas).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import { BomStep1 } from "./BomStep1";
import { BomStep2 } from "./BomStep2";

/** Available onboarding steps. */
export type BomStep = "select-materials" | "configure-materials";

/** Ordered list of all steps. */
const STEPS: readonly BomStep[] = ["select-materials", "configure-materials"];

/** Human-readable label for each step. */
const STEP_LABELS: Record<BomStep, string> = {
  "select-materials": "Seleccionar Materiales",
  "configure-materials": "Configurar Materiales",
};

interface BomStepManagerProps {
  /** Variante de producto para la que se crea la lista de materiales. */
  productoVarianteId: number;
  /** Called when the wizard should close without completing (cancel / back). */
  onClose?: () => void;
  /** Called after the lista de materiales is created successfully. */
  onSuccess: () => void;
}

/**
 * BomStepManager
 *
 * Orchestrator for the BOM (lista de materiales) onboarding wizard. The variant
 * is fixed via `productoVarianteId`; this holds the current step and the
 * component ids chosen in Step 1, and renders the matching step component.
 */
export function BomStepManager({
  productoVarianteId,
  onClose,
  onSuccess,
}: BomStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<BomStep>(STEPS[0]);
  const [selectedComponentIds, setSelectedComponentIds] = useState<number[]>(
    [],
  );

  /** Step 1 → store the selected component ids and advance to configuration. */
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
        {currentStep === "select-materials" && (
          <BomStep1
            onNext={handleMaterialsSelected}
            onBack={() => onClose?.()}
          />
        )}

        {currentStep === "configure-materials" && (
          <BomStep2
            productoVarianteId={productoVarianteId}
            componentIds={selectedComponentIds}
            onBack={() => setCurrentStep("select-materials")}
            onSuccess={onSuccess}
          />
        )}
      </div>
    </div>
  );
}
