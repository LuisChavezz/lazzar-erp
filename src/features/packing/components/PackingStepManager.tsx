"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import {
  PACKING_WIZARD_STEPS,
  PACKING_WIZARD_STEP_LABELS,
  type PackingWizardStep,
} from "../constants/packingWizardSteps";
import type { PackingStep1Values } from "../schemas/packing.schema";
import { PackingWizardStep1 } from "./PackingWizardStep1";
import { PackingWizardStep2 } from "./PackingWizardStep2";

interface PackingStepManagerProps {
  /** Se llama cuando el flujo termina (packing registrado) o se cierra. */
  onClose: () => void;
}

/**
 * Orquestador del asistente de packing (2 pasos), mismo patrón que picking:
 *
 *  - Paso 1 (`PackingWizardStep1`): elige el picking origen. Solo ese id vive
 *    en el manager (a diferencia de picking, aquí no hay más encabezado que
 *    capturar en este paso — operador/almacén/empresa/sucursal/pedido se
 *    heredan del picking en el backend), así que "Regresar" desde el Paso 2
 *    lo conserva.
 *  - Paso 2 (`PackingWizardStep2`): carga el pendiente por línea del picking y
 *    captura el encabezado propio de packing (cajas/peso/volumen/
 *    observaciones) + las cantidades a empacar; al registrar, cierra el
 *    diálogo. Su propio estado (encabezado y cantidades) NO sobrevive un
 *    "Regresar" — se remonta limpio, mismo comportamiento aceptado que
 *    picking tiene para sus cantidades por talla.
 */
export function PackingStepManager({ onClose }: PackingStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<PackingWizardStep>(PACKING_WIZARD_STEPS[0]);
  const [step1, setStep1] = useState<PackingStep1Values>({ picking: 0 });

  const handleStep1Next = (values: PackingStep1Values) => {
    setStep1(values);
    setCurrentStep("step-2");
  };

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={PACKING_WIZARD_STEPS}
        currentStep={currentStep}
        labels={PACKING_WIZARD_STEP_LABELS}
      />

      <div>
        {currentStep === "step-1" && (
          <PackingWizardStep1 initialValues={step1} onNext={handleStep1Next} />
        )}
        {currentStep === "step-2" && (
          <PackingWizardStep2
            step1={step1}
            onBack={() => setCurrentStep("step-1")}
            onSuccess={onClose}
          />
        )}
      </div>
    </div>
  );
}
