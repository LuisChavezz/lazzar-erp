"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-form";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import type {
  SampleProductionVariant,
  SpecialOrderLine,
} from "../interfaces/special-order.interface";
import { useSampleSkuOnboardingForm } from "../hooks/useSampleSkuOnboardingForm";
import { SampleSkuOnboardingStep1 } from "./SampleSkuOnboardingStep1";
import { SampleSkuOnboardingStep2 } from "./SampleSkuOnboardingStep2";
import { SampleSkuOnboardingResult } from "./SampleSkuOnboardingResult";

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
 * Al terminar con éxito NO se cierra: muestra lo creado
 * (`SampleSkuOnboardingResult`), incluido el SKU de catálogo, que el detalle
 * del pedido no expone.
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
  // Lo que creó el alta. Con él, el asistente deja los pasos y muestra el
  // resultado hasta que se cierre a mano (no se cierra solo al terminar).
  const [result, setResult] = useState<SampleProductionVariant[] | null>(null);

  const onboarding = useSampleSkuOnboardingForm({
    pedidoId,
    line,
    onSuccess: setResult,
    onColorRejected: () => setCurrentStep("select-materials"),
  });

  // Suscripción al store y no `form.getFieldValue()` en el render: esa lectura
  // no es reactiva y el React Compiler puede memoizarla sobre `form`, que es
  // una referencia estable.
  const materials = useStore(
    onboarding.form.store,
    (state) => state.values.materia_prima_detalle,
  );

  const labels: Record<SampleSkuOnboardingStep, string> = {
    "select-materials": onboarding.requiresColor
      ? "Color y materiales"
      : "Seleccionar materiales",
    "configure-materials": "Configurar materiales",
  };

  if (result) {
    return <SampleSkuOnboardingResult variants={result} onClose={onClose} />;
  }

  return (
    <div className="w-full space-y-6">
      <StepProgressBar steps={STEPS} currentStep={currentStep} labels={labels} />

      {currentStep === "select-materials" && (
        <SampleSkuOnboardingStep1
          line={line}
          onboarding={onboarding}
          initialSelectedIds={materials.map((row) => row.componente)}
          onNext={(componentIds) => {
            onboarding.setMaterials(componentIds);
            setCurrentStep("configure-materials");
          }}
          onClose={onClose}
        />
      )}

      {currentStep === "configure-materials" && (
        <SampleSkuOnboardingStep2
          onboarding={onboarding}
          onBack={() => setCurrentStep("select-materials")}
        />
      )}
    </div>
  );
}
