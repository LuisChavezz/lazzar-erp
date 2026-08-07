/**
 * Pasos del asistente de alta de orden de bordado. Mismo patrón de `type` +
 * array + `Record` de etiquetas que el resto de wizards del proyecto
 * (picking, recepciones, órdenes de compra), consumido por `StepProgressBar`.
 */
export type EmbroideryWizardStep = "step-1" | "step-2";

export const EMBROIDERY_WIZARD_STEPS: readonly EmbroideryWizardStep[] = [
  "step-1",
  "step-2",
];

export const EMBROIDERY_WIZARD_STEP_LABELS: Record<EmbroideryWizardStep, string> = {
  "step-1": "Pedido y prioridad",
  "step-2": "Prendas a bordar",
};
