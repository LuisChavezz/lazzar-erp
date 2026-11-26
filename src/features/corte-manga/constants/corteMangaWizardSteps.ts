/**
 * Pasos del asistente de alta de orden de corte de manga. Mismo patrón de
 * `type` + array + `Record` de etiquetas que reflejante y bordado, consumido por
 * `StepProgressBar`.
 */
export type CorteMangaWizardStep = "step-1" | "step-2";

export const CORTE_MANGA_WIZARD_STEPS: readonly CorteMangaWizardStep[] = [
  "step-1",
  "step-2",
];

export const CORTE_MANGA_WIZARD_STEP_LABELS: Record<CorteMangaWizardStep, string> = {
  "step-1": "Pedido",
  "step-2": "Prendas a cortar",
};
