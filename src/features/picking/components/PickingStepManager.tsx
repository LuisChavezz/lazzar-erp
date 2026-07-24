"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import {
  PICKING_WIZARD_STEPS,
  PICKING_WIZARD_STEP_LABELS,
  type PickingWizardStep,
} from "../constants/pickingWizardSteps";
import {
  createEmptyPickingHeaderValues,
  type PickingHeaderValues,
} from "../schemas/picking.schema";
import { PickingWizardStep1 } from "./PickingWizardStep1";
import { PickingWizardStep2 } from "./PickingWizardStep2";

interface PickingStepManagerProps {
  /** Se llama cuando el flujo termina (picking registrado) o se cierra. */
  onClose: () => void;
}

/**
 * Orquestador del asistente de picking parcial (2 pasos), mismo patrón que
 * recepciones/órdenes de compra:
 *
 *  - Paso 1 (`PickingWizardStep1`): elige pedido/almacén + encabezado y captura
 *    los valores. El encabezado vive AQUÍ como fuente de la verdad, así que
 *    "Regresar" desde el Paso 2 lo conserva.
 *  - Paso 2 (`PickingWizardStep2`): carga el pendiente por talla del pedido y
 *    captura las cantidades a surtir; al registrar, cierra el diálogo.
 */
export function PickingStepManager({ onClose }: PickingStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<PickingWizardStep>(PICKING_WIZARD_STEPS[0]);
  const [header, setHeader] = useState<PickingHeaderValues>(() =>
    createEmptyPickingHeaderValues(),
  );

  const handleStep1Next = (values: PickingHeaderValues) => {
    setHeader(values);
    setCurrentStep("step-2");
  };

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={PICKING_WIZARD_STEPS}
        currentStep={currentStep}
        labels={PICKING_WIZARD_STEP_LABELS}
      />

      <div>
        {currentStep === "step-1" && (
          <PickingWizardStep1 initialValues={header} onNext={handleStep1Next} />
        )}
        {currentStep === "step-2" && (
          <PickingWizardStep2
            header={header}
            onBack={() => setCurrentStep("step-1")}
            onSuccess={onClose}
          />
        )}
      </div>
    </div>
  );
}
