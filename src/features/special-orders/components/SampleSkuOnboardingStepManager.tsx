"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import type { SpecialOrderLine } from "../interfaces/special-order.interface";
import { useSampleSkuOnboardingForm } from "../hooks/useSampleSkuOnboardingForm";
import { SampleSkuOnboardingStep1 } from "./SampleSkuOnboardingStep1";
import { SampleSkuOnboardingStep2 } from "./SampleSkuOnboardingStep2";

type SampleSkuOnboardingStep = "select-materials" | "configure-materials";

const STEPS: readonly SampleSkuOnboardingStep[] = ["select-materials", "configure-materials"];

interface SampleSkuOnboardingStepManagerProps {
  pedidoId: number;
  line: SpecialOrderLine;
  /** Cierra el asistente, se haya completado o no. */
  onClose: () => void;
}

/**
 * Orquestador del alta de SKU de producción + lista de materiales de una línea
 * de muestra. Mismo corte que `BomStepManager` —"seleccionar" y luego
 * "configurar"—, con el color de la línea sumado al Paso 1.
 *
 * El formulario vive AQUÍ y no en un paso: los pasos se desmontan al cambiar,
 * y así regresar al Paso 1 conserva lo capturado de los materiales que sigan
 * seleccionados (ver `setMaterials`).
 */
export function SampleSkuOnboardingStepManager({
  pedidoId,
  line,
  onClose,
}: SampleSkuOnboardingStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<SampleSkuOnboardingStep>(STEPS[0]);

  const onboarding = useSampleSkuOnboardingForm({
    pedidoId,
    line,
    onSuccess: onClose,
    onColorRejected: () => setCurrentStep("select-materials"),
  });

  const labels: Record<SampleSkuOnboardingStep, string> = {
    "select-materials": onboarding.requiresColor
      ? "Color y materiales"
      : "Seleccionar materiales",
    "configure-materials": "Configurar materiales",
  };

  return (
    <div className="w-full space-y-6">
      <StepProgressBar steps={STEPS} currentStep={currentStep} labels={labels} />

      {currentStep === "select-materials" && (
        <SampleSkuOnboardingStep1
          line={line}
          onboarding={onboarding}
          initialSelectedIds={onboarding.form
            .getFieldValue("materia_prima_detalle")
            .map((row) => row.componente)}
          onNext={(componentIds) => {
            onboarding.setMaterials(componentIds);
            setCurrentStep("configure-materials");
          }}
          onClose={onClose}
        />
      )}

      {currentStep === "configure-materials" && (
        <SampleSkuOnboardingStep2
          line={line}
          onboarding={onboarding}
          onBack={() => setCurrentStep("select-materials")}
        />
      )}
    </div>
  );
}
