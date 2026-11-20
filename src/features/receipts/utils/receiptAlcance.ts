import type { Receipt } from "../interfaces/receipt.interface";

export type ReceiptAlcance = "PARCIAL" | "COMPLETA";

/**
 * Si la recepción llegó PARCIAL (quedó algo pendiente de la orden) o COMPLETA.
 * Lo dice el backend (`alcance_recepcion`); en las recepciones anteriores al
 * filtro de Calidad lo dice su estatus (3 Parcial, 2 Recibida). `null` = no se sabe.
 */
export const receiptAlcance = (r: Pick<Receipt, "estatus" | "alcance_recepcion">): ReceiptAlcance | null => {
  if (r.alcance_recepcion === "PARCIAL" || r.alcance_recepcion === "COMPLETA") return r.alcance_recepcion;
  if (r.estatus === 3) return "PARCIAL";
  if (r.estatus === 2) return "COMPLETA";
  return null;
};

export const RECEIPT_ALCANCE_LABEL: Record<ReceiptAlcance, string> = {
  PARCIAL: "Parcial",
  COMPLETA: "Completa",
};
