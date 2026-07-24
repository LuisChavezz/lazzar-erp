/**
 * Pasos del asistente (wizard) de captura de picking. Mismo patrón de
 * `type` + array + `Record` de etiquetas que el resto de wizards del proyecto
 * (recepciones, órdenes de compra), consumido por `StepProgressBar`.
 */
export type PickingWizardStep = "step-1" | "step-2";

export const PICKING_WIZARD_STEPS: readonly PickingWizardStep[] = [
  "step-1",
  "step-2",
];

export const PICKING_WIZARD_STEP_LABELS: Record<PickingWizardStep, string> = {
  "step-1": "Pedido y almacén",
  "step-2": "Surtir tallas",
};
