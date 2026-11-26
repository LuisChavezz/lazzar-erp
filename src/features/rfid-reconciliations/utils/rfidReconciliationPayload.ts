import type { ReceiptOrderCandidate } from "@/src/features/receipts/interfaces/receipt-onboarding.interface";
import type { CreateRfidReconciliationPayload } from "../interfaces/rfid-reconciliation.interface";

/** La OC u OP elegida en el paso 1 (el encuadre no se levanta sobre una SM). */
export type RfidReconciliationCandidate = Extract<ReceiptOrderCandidate, { type: "compra" | "produccion" }>;

/** Cuerpo del `POST` a partir de la orden elegida y lo capturado. Puro. */
export const buildCreateRfidReconciliationPayload = (
  candidate: RfidReconciliationCandidate,
  values: { almacen: number; serie_codigo: string; remision: string; factura_referencia: string; observaciones: string },
): CreateRfidReconciliationPayload => {
  const optional = (value: string) => value.trim() || undefined;
  return {
    ...(candidate.type === "compra"
      ? { tipo_origen: "OC" as const, orden_compra: candidate.order.id }
      : { tipo_origen: "OP" as const, op: candidate.order.id }),
    almacen: values.almacen,
    serie_codigo: values.serie_codigo,
    remision: optional(values.remision),
    factura_referencia: optional(values.factura_referencia),
    observaciones: optional(values.observaciones),
  };
};
