import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";

/**
 * Código ISO de la moneda elegida en el encabezado de la OC (`moneda` es su
 * id), resuelto con el catálogo del onboarding. `null` sin catálogo o si el id
 * no aparece: quien formatea lo pinta sin prefijo ni símbolo (EC-606).
 */
export const onboardingMonedaCodigo = (
  onboardingData: PurchaseOrderOnboardingData | undefined,
  monedaId: number,
): string | null =>
  onboardingData?.catalogos.monedas.find((moneda) => moneda.id === monedaId)?.codigo_iso ?? null;
