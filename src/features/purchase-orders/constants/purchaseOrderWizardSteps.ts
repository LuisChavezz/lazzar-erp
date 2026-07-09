/**
 * Pasos compartidos por los wizards de alta (`PurchaseOrderOnboardingStepManager`)
 * y edición (`PurchaseOrderEditStepManager`) de una orden de compra — ambos
 * colapsaron a la misma forma de 2 pasos (encabezado → productos, donde el
 * Step 2 es también el paso final que dispara la mutación).
 */
export type PurchaseOrderWizardStep = "step-1" | "step-2";

export const PURCHASE_ORDER_WIZARD_STEPS: readonly PurchaseOrderWizardStep[] = [
  "step-1",
  "step-2",
];

export const PURCHASE_ORDER_WIZARD_STEP_LABELS: Record<PurchaseOrderWizardStep, string> = {
  "step-1": "Datos generales",
  "step-2": "Agregar productos",
};
