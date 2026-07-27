/**
 * Pasos del asistente (wizard) de captura de packing. Mismo patrón de `type`
 * + array + `Record` de etiquetas que el resto de wizards del proyecto
 * (picking, recepciones, órdenes de compra), consumido por `StepProgressBar`.
 */
export type PackingWizardStep = "step-1" | "step-2";

export const PACKING_WIZARD_STEPS: readonly PackingWizardStep[] = ["step-1", "step-2"];

export const PACKING_WIZARD_STEP_LABELS: Record<PackingWizardStep, string> = {
  "step-1": "Picking origen",
  "step-2": "Empacar líneas",
};
