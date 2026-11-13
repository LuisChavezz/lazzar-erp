"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import type { ProductSelectorItem } from "@/src/features/products/interfaces/product-selector.interface";
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
 *
 * También vive aquí la selección de materiales como OBJETOS del selector de
 * productos (nombre, código, unidad): el Paso 1 la recibe para fijarla arriba
 * al regresar, y el Paso 2 la usa para pintar cada fila, sin volver a pedir
 * el catálogo ni resolver ids sueltos.
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

  // Materiales elegidos en el Paso 1, en el orden de las filas del formulario.
  const [selectedMaterials, setSelectedMaterials] = useState<ProductSelectorItem[]>([]);
  const onboarding = useSampleSkuOnboardingForm({
    pedidoId,
    line,
    onSuccess: setResult,
    onColorRejected: () => setCurrentStep("select-materials"),
  });

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
          initialSelected={selectedMaterials}
          onNext={(picked) => {
            setSelectedMaterials(picked);
            onboarding.setMaterials(
              picked.map((product) => product.id),
              new Map(picked.map((product) => [product.id, product.unidad_id])),
            );
            setCurrentStep("configure-materials");
          }}
          onClose={onClose}
        />
      )}

      {currentStep === "configure-materials" && (
        <SampleSkuOnboardingStep2
          onboarding={onboarding}
          materials={selectedMaterials}
          onBack={() => setCurrentStep("select-materials")}
        />
      )}
    </div>
  );
}
