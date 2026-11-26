"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import {
  CORTE_MANGA_WIZARD_STEPS,
  CORTE_MANGA_WIZARD_STEP_LABELS,
  type CorteMangaWizardStep,
} from "../constants/corteMangaWizardSteps";
import type { CreateCorteMangaOrderFormValues } from "../schemas/corte-manga-order.schema";
import { CorteMangaOrderStep1 } from "./CorteMangaOrderStep1";
import { CorteMangaOrderStep2 } from "./CorteMangaOrderStep2";

interface CorteMangaOrderStepManagerProps {
  /** Se llama cuando el flujo termina (orden creada). */
  onClose: () => void;
  /** Ver `CorteMangaOrderStep2Props.onViewExistingOrder` — solo se reenvía. */
  onViewExistingOrder: (id: number) => void;
}

/**
 * Encabezado inicial. Es una FÁBRICA, no una constante de módulo, para que
 * ninguna apertura del asistente herede un objeto mutado por otra. Mismo
 * criterio que `createEmptyReflectiveHeader()`.
 */
const createEmptyCorteMangaHeader = (): CreateCorteMangaOrderFormValues => ({
  pedido: 0,
  observaciones: "",
});

/**
 * Orquestador del alta de orden de corte de manga (2 pasos, EC-967), mismo
 * patrón que `ReflectiveOrderStepManager`:
 *
 *  - Paso 1 (`CorteMangaOrderStep1`): pedido y observaciones. El encabezado vive
 *    AQUÍ, así que "Regresar" desde el Paso 2 lo conserva.
 *  - Paso 2 (`CorteMangaOrderStep2`): qué prendas del pedido entran y con
 *    cuántas piezas, topadas a lo programado por Mesa de Control a Corte de
 *    manga; al crear, cierra el diálogo.
 *
 * Sustituye al alta de UN SOLO PASO (`CorteMangaOrderCreateForm`, retirado),
 * que mandaba solo `{pedido, observaciones}` y dejaba que el backend tomara el
 * 100% del pedido: con el pedido programado solo en parte, el POST respondía
 * 400 por exceder lo programado.
 */
export function CorteMangaOrderStepManager({
  onClose,
  onViewExistingOrder,
}: CorteMangaOrderStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<CorteMangaWizardStep>(
    CORTE_MANGA_WIZARD_STEPS[0],
  );
  const [header, setHeader] = useState<CreateCorteMangaOrderFormValues>(
    createEmptyCorteMangaHeader,
  );

  const handleStep1Next = (values: CreateCorteMangaOrderFormValues) => {
    setHeader(values);
    setCurrentStep("step-2");
  };

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={CORTE_MANGA_WIZARD_STEPS}
        currentStep={currentStep}
        labels={CORTE_MANGA_WIZARD_STEP_LABELS}
      />

      <div>
        {currentStep === "step-1" && (
          <CorteMangaOrderStep1 initialValues={header} onNext={handleStep1Next} />
        )}
        {currentStep === "step-2" && (
          <CorteMangaOrderStep2
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
