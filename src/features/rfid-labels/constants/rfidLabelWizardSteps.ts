/** Pasos del asistente de "Nueva impresión" de etiquetas RFID (2 pasos, mismo
 *  patrón que picking/recepciones): buscar SKU/producto → configurar, imprimir
 *  y registrar. */
export const RFID_LABEL_WIZARD_STEPS = ["buscar", "imprimir"] as const;

export type RfidLabelWizardStep = (typeof RFID_LABEL_WIZARD_STEPS)[number];

export const RFID_LABEL_WIZARD_STEP_LABELS: Record<RfidLabelWizardStep, string> = {
  buscar: "Buscar",
  imprimir: "Imprimir",
};
