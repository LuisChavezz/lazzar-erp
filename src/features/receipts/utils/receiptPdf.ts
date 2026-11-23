import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { ReceiptDetail } from "../interfaces/receipt.interface";

/** `Recepcion.EstatusRecepcion.CANCELADA` (nucleo-erp, compras/models.py). */
export const RECEIPT_ESTATUS_CANCELADA = 6;

/** ¿La recepción está cancelada? (`estatus` 6, EC-925). */
export const isReceiptCancelled = (receipt: Pick<ReceiptDetail, "estatus">): boolean =>
  receipt.estatus === RECEIPT_ESTATUS_CANCELADA;

/**
 * Identidad de una recepción para su PDF (EC-856). Un solo código, `RC`, para
 * ambos orígenes: comparten la serie de folios (RC/RT/RZ) y el origen se dice
 * DENTRO del PDF, no en el nombre del archivo.
 *
 * Cancelada (EC-925): banner, marca de agua y pie de la base con el
 * `motivo_cancelacion` (EC-926), como el PDF de la OC. Sale del detalle fresco
 * que lee la fuente, no del que muestra el diálogo.
 */
export const receiptPdfDescriptor = (
  receipt: Pick<ReceiptDetail, "id" | "folio" | "estatus" | "motivo_cancelacion">,
): DocumentPdfDescriptor => ({
  type: "RC",
  id: receipt.id,
  folio: receipt.folio,
  cancelled: isReceiptCancelled(receipt),
  cancellationReason: receipt.motivo_cancelacion ?? null,
});

/** Origen de una recepción tal como lo dice el PDF. */
export interface ReceiptOrigin {
  /** "Orden de compra" / "Orden de producción" / "Salida a maquila". */
  label: string;
  /**
   * Folio de la OC o de la OP según `tipo_origen`; en "SM", la referencia de la
   * SM (`receiptSalidaMaquilaRef`). `null` si no llegó.
   */
  folio: string | null;
  /** SM con que regresó, si es de una ("SM-00005 · OB-00012"); `null` si no. */
  salidaMaquila: string | null;
}

type ReceiptSalidaMaquilaFields = Partial<
  Pick<ReceiptDetail, "salida_maquila_folio" | "salida_maquila_origen_folio">
>;

/**
 * "SM-00005 · 2026-OB-00012": la SM con que regresó la recepción y el folio de
 * su OP/OB/OR (EC-919). Los folios se muestran tal cual (dependen de la serie).
 * `null` si la recepción no es de una SM.
 */
export const receiptSalidaMaquilaRef = (receipt: ReceiptSalidaMaquilaFields): string | null => {
  const sm = receipt.salida_maquila_folio?.trim();
  if (!sm) return null;
  const origen = receipt.salida_maquila_origen_folio?.trim();
  return origen ? `${sm} · ${origen}` : sm;
};

/**
 * Origen por `tipo_origen`: el folio de la OC (`orden_compra_folio`) o el de
 * la OP (`op_folio`, EC-879). Se lee el que corresponde al origen y no "el que
 * venga", para no mostrar el folio equivocado si el backend mandara ambos. Un
 * `tipo_origen` que no sea "OC" ni "OP" se dice "Desconocido", como en el
 * diálogo de WMS, en vez de suponer una orden de compra.
 */
export const receiptOrigin = (
  receipt: {
    tipo_origen: string;
    orden_compra_folio: string | null;
    op_folio: string | null;
  } & ReceiptSalidaMaquilaFields,
): ReceiptOrigin => {
  const salidaMaquila = receiptSalidaMaquilaRef(receipt);
  if (receipt.tipo_origen === "OC") {
    return { label: "Orden de compra", folio: receipt.orden_compra_folio?.trim() || null, salidaMaquila };
  }
  if (receipt.tipo_origen === "OP") {
    // Una SM de OP regresa como recepción de su OP, con la SM puesta.
    return { label: "Orden de producción", folio: receipt.op_folio?.trim() || null, salidaMaquila };
  }
  if (receipt.tipo_origen === "SM") {
    // Regreso de una SM de OB/OR: su folio de origen es la SM (nucleo-erp #1237).
    return { label: "Salida a maquila", folio: salidaMaquila, salidaMaquila };
  }
  return { label: "Desconocido", folio: null, salidaMaquila };
};
