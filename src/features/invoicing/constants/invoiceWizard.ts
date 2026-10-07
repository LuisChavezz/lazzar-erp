export type InvoiceWizardStep = "step-1" | "step-2";

export const INVOICE_WIZARD_STEPS: readonly InvoiceWizardStep[] = ["step-1", "step-2"];

export const INVOICE_WIZARD_STEP_LABELS: Record<InvoiceWizardStep, string> = {
  "step-1": "Pedido",
  "step-2": "Piezas a facturar",
};
