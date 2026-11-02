import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";
import { onboardingMonedaCodigo } from "./onboardingMonedaCodigo";

/**
 * Moneda que la "Nueva OC" preselecciona al elegir un proveedor (EC-689): la
 * dada de alta en el proveedor, solo si aparece en `catalogos.monedas`. Puede
 * no aparecer (moneda inactiva o de otra empresa): entonces `null` y la moneda
 * del formulario no se toca. `null` también sin proveedor (`0`).
 */
export const proveedorDefaultMonedaId = (
  onboardingData: PurchaseOrderOnboardingData,
  proveedorId: number,
): number | null => {
  if (!proveedorId) return null;
  const monedaId = onboardingData.busqueda.proveedores.find((p) => p.id === proveedorId)?.moneda_id;
  if (monedaId == null) return null;
  return onboardingMonedaCodigo(onboardingData, monedaId) !== null ? monedaId : null;
};

export interface ProveedorChangeResolution {
  /** Moneda a aplicar junto con el proveedor; `null` = dejar la actual. */
  moneda: number | null;
  /** El cambio movería la moneda de renglones con precio: hay que confirmarlo. */
  needsConfirmation: boolean;
}

/**
 * Qué hace la "Nueva OC" al cambiar de proveedor (EC-689): siempre aplica la
 * moneda del proveedor, aunque el usuario hubiera elegido otra a mano; nunca
 * la toca si el proveedor no trae una válida o se vuelve a "Seleccionar
 * proveedor…". Solo pide confirmación cuando la moneda cambia de verdad y ya
 * hay renglones con precio.
 */
export const resolveProveedorChange = ({
  onboardingData,
  nextProveedor,
  currentMoneda,
  pricedLineCount,
}: {
  onboardingData: PurchaseOrderOnboardingData;
  nextProveedor: number;
  currentMoneda: number;
  pricedLineCount: number;
}): ProveedorChangeResolution => {
  const moneda = proveedorDefaultMonedaId(onboardingData, nextProveedor);
  const changesMoneda = moneda !== null && moneda !== currentMoneda;
  return { moneda, needsConfirmation: changesMoneda && pricedLineCount > 0 };
};
