"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import {
  RFID_LABEL_WIZARD_STEPS,
  RFID_LABEL_WIZARD_STEP_LABELS,
  type RfidLabelWizardStep,
} from "../constants/rfidLabelWizardSteps";
import { RfidLabelSearchStep } from "./RfidLabelSearchStep";
import { RfidLabelPrintStep } from "./RfidLabelPrintStep";
import type { RfidOnboardingResult } from "../interfaces/rfid-onboarding.interface";

interface RfidLabelCreateStepManagerProps {
  /** Se llama cuando el flujo termina con éxito (impresión registrada). */
  onClose: () => void;
}

/**
 * Orquestador de "Nueva impresión" (2 pasos), mismo patrón que
 * `PickingStepManager`:
 *
 *  - Paso 1 (`RfidLabelSearchStep`): busca, resalta un SKU/producto y confirma
 *    con "Continuar". El texto de búsqueda y la selección viven AQUÍ para que
 *    "Cambiar" desde el Paso 2 los conserve (la fila regresa resaltada).
 *  - Paso 2 (`RfidLabelPrintStep`): configura cantidad/RFID, imprime el lote y
 *    registra; al terminar con éxito, cierra el diálogo.
 */
export function RfidLabelCreateStepManager({ onClose }: RfidLabelCreateStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<RfidLabelWizardStep>(
    RFID_LABEL_WIZARD_STEPS[0],
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RfidOnboardingResult | null>(null);

  const handleConfirm = (result: RfidOnboardingResult) => {
    setSelected(result);
    setCurrentStep("imprimir");
  };

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={RFID_LABEL_WIZARD_STEPS}
        currentStep={currentStep}
        labels={RFID_LABEL_WIZARD_STEP_LABELS}
      />

      <div>
        {currentStep === "buscar" && (
          <RfidLabelSearchStep
            query={query}
            onQueryChange={setQuery}
            initialSelected={selected}
            onConfirm={handleConfirm}
          />
        )}
        {currentStep === "imprimir" && selected && (
          <RfidLabelPrintStep
            selected={selected}
            onBack={() => setCurrentStep("buscar")}
            onSuccess={onClose}
          />
        )}
      </div>
    </div>
  );
}
