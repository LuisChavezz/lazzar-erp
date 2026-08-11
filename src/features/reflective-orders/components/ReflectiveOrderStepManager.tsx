"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import {
  REFLECTIVE_WIZARD_STEPS,
  REFLECTIVE_WIZARD_STEP_LABELS,
  type ReflectiveWizardStep,
} from "../constants/reflectiveWizardSteps";
import type { CreateReflectiveOrderFormValues } from "../schemas/reflective-order.schema";
import { ReflectiveOrderStep1 } from "./ReflectiveOrderStep1";
import { ReflectiveOrderStep2 } from "./ReflectiveOrderStep2";

interface ReflectiveOrderStepManagerProps {
  /** Se llama cuando el flujo termina (orden creada) o se cierra. */
  onClose: () => void;
  /** Ver `ReflectiveOrderStep2Props.onViewExistingOrder` — solo se reenvía. */
  onViewExistingOrder: (id: number) => void;
}

/**
 * Encabezado inicial. `prioridad` arranca en `1` porque es el default del propio
 * backend (`IntegerField(default=1)`) — ver `useReflectiveStep1Form`.
 *
 * Es una FÁBRICA, no una constante de módulo: un objeto único compartido por
 * todas las aperturas del asistente convierte cualquier mutación in situ —hoy no
 * hay ninguna— en un default corrupto para el resto de la sesión, con un síntoma
 * (pedido preseleccionado al reabrir) muy lejos de su causa. Mismo criterio que
 * `createEmptyEmbroideryHeader()`.
 */
const createEmptyReflectiveHeader = (): CreateReflectiveOrderFormValues => ({
  pedido: 0,
  prioridad: 1,
  observaciones: "",
});

/**
 * Orquestador del alta de orden de reflejante (2 pasos), mismo patrón que
 * `EmbroideryOrderStepManager`:
 *
 *  - Paso 1 (`ReflectiveOrderStep1`): pedido, prioridad y observaciones. El
 *    encabezado vive AQUÍ como fuente de la verdad, así que "Regresar" desde el
 *    Paso 2 lo conserva tal cual se capturó.
 *  - Paso 2 (`ReflectiveOrderStep2`): elige qué prendas del pedido entran y con
 *    cuántas piezas; al crear, cierra el diálogo.
 *
 * Sustituye al alta de UN SOLO PASO (`ReflectiveOrderCreateForm`, retirado), que
 * era correcta mientras el POST admitía solo `{ pedido, prioridad,
 * observaciones }` y el backend derivaba el 100% de las líneas. Desde que acepta
 * `detalles_override` hay una decisión real que capturar —qué líneas y con
 * cuántas piezas—, y el pedido puede cubrirse en varias OR parciales.
 *
 * La selección por línea NO vive aquí sino en el hook del Paso 2, que solo está
 * montado mientras ese paso está en pantalla. De ahí sale gratis la regla de que
 * cambiar de pedido no puede arrastrar líneas del anterior: al regresar al Paso
 * 1 el estado del Paso 2 se descarta, y volver a entrar lo siembra de nuevo
 * desde datos recién traídos del servidor.
 */
export function ReflectiveOrderStepManager({
  onClose,
  onViewExistingOrder,
}: ReflectiveOrderStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<ReflectiveWizardStep>(
    REFLECTIVE_WIZARD_STEPS[0],
  );
  const [header, setHeader] = useState<CreateReflectiveOrderFormValues>(
    createEmptyReflectiveHeader,
  );

  const handleStep1Next = (values: CreateReflectiveOrderFormValues) => {
    setHeader(values);
    setCurrentStep("step-2");
  };

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={REFLECTIVE_WIZARD_STEPS}
        currentStep={currentStep}
        labels={REFLECTIVE_WIZARD_STEP_LABELS}
      />

      <div>
        {currentStep === "step-1" && (
          <ReflectiveOrderStep1 initialValues={header} onNext={handleStep1Next} />
        )}
        {currentStep === "step-2" && (
          <ReflectiveOrderStep2
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
