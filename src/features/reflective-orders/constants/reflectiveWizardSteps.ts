/**
 * Pasos del asistente de alta de orden de reflejante. Mismo patrón de `type` +
 * array + `Record` de etiquetas que el resto de wizards del proyecto (bordado,
 * picking, recepciones, órdenes de compra), consumido por `StepProgressBar`.
 */
export type ReflectiveWizardStep = "step-1" | "step-2";

export const REFLECTIVE_WIZARD_STEPS: readonly ReflectiveWizardStep[] = [
  "step-1",
  "step-2",
];

export const REFLECTIVE_WIZARD_STEP_LABELS: Record<ReflectiveWizardStep, string> = {
  "step-1": "Pedido y prioridad",
  "step-2": "Prendas a reflejar",
};
