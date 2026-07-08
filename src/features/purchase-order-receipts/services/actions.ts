import { getReceipts } from "@/src/features/receipts/services/actions";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";

// Reutiliza la acción compartida `getReceipts`, fijando `tipo_origen: "OC"`.
// El backend garantiza que toda fila de esta respuesta trae proveedor/orden
// de compra (a diferencia del tipo `Receipt` general, que también modela
// OP), por lo que aquí se afirma el tipo más angosto en un solo lugar.
export const getPurchaseOrderReceipts = async (): Promise<PurchaseOrderReceipt[]> => {
  const data = await getReceipts("OC");
  return data as PurchaseOrderReceipt[];
};
