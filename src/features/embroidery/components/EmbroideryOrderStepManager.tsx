"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import {
  EMBROIDERY_WIZARD_STEPS,
  EMBROIDERY_WIZARD_STEP_LABELS,
  type EmbroideryWizardStep,
} from "../constants/embroideryWizardSteps";
import type { CreateEmbroideryOrderFormValues } from "../schemas/embroidery-order.schema";
import { EmbroideryOrderStep1 } from "./EmbroideryOrderStep1";
import { EmbroideryOrderStep2 } from "./EmbroideryOrderStep2";

interface EmbroideryOrderStepManagerProps {
  /** Se llama cuando el flujo termina (orden creada) o se cierra. */
  onClose: () => void;
  /** Ver `EmbroideryOrderStep2Props.onViewExistingOrder` — solo se reenvía. */
  onViewExistingOrder: (id: number) => void;
}

/**
 * Encabezado inicial. `prioridad` arranca en `1` porque es el default del
 * propio backend (`IntegerField(default=1)`) — ver `useEmbroideryStep1Form`.
 *
 * Es una FÁBRICA, no una constante de módulo: un objeto único compartido por
 * todas las aperturas del asistente convierte cualquier mutación in situ
 * —hoy no hay ninguna— en un default corrupto para el resto de la sesión, con
 * un síntoma (pedido preseleccionado al reabrir) muy lejos de su causa. Mismo
 * criterio que `createEmptyPickingHeaderValues()`.
 */
const createEmptyEmbroideryHeader = (): CreateEmbroideryOrderFormValues => ({
  pedido: 0,
  prioridad: 1,
  observaciones: "",
});

/**
 * Orquestador del alta de orden de bordado (2 pasos), mismo patrón que
 * `PickingStepManager`:
 *
 *  - Paso 1 (`EmbroideryOrderStep1`): pedido, prioridad y observaciones. El
 *    encabezado vive AQUÍ como fuente de la verdad, así que "Regresar" desde el
 *    Paso 2 lo conserva tal cual se capturó.
 *  - Paso 2 (`EmbroideryOrderStep2`): elige qué prendas del pedido entran y con
 *    cuántas piezas; al crear, cierra el diálogo.
 *
 * La selección por línea NO vive aquí sino en el hook del Paso 2, que solo está
 * montado mientras ese paso está en pantalla (igual que picking). De ahí sale
 * gratis la regla de que cambiar de pedido no puede arrastrar líneas del
 * anterior: al regresar al Paso 1 el estado del Paso 2 se descarta, y volver a
 * entrar lo siembra de nuevo desde datos recién traídos del servidor.
 */
export function EmbroideryOrderStepManager({
  onClose,
  onViewExistingOrder,
}: EmbroideryOrderStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<EmbroideryWizardStep>(
    EMBROIDERY_WIZARD_STEPS[0],
  );
  const [header, setHeader] = useState<CreateEmbroideryOrderFormValues>(
    createEmptyEmbroideryHeader,
  );

  const handleStep1Next = (values: CreateEmbroideryOrderFormValues) => {
    setHeader(values);
    setCurrentStep("step-2");
  };

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={EMBROIDERY_WIZARD_STEPS}
        currentStep={currentStep}
        labels={EMBROIDERY_WIZARD_STEP_LABELS}
      />

      <div>
        {currentStep === "step-1" && (
          <EmbroideryOrderStep1 initialValues={header} onNext={handleStep1Next} />
        )}
        {currentStep === "step-2" && (
          <EmbroideryOrderStep2
            header={header}
            onBack={() => setCurrentStep("step-1")}
            onSuccess={onClose}
            onViewExistingOrder={onViewExistingOrder}
          />
        )}
      </div>
    </div>
  );
}
