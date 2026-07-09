/**
 * Genera el PDF de una orden de compra en el cliente usando react-pdf y activa
 * la descarga.
 *
 * Responsabilidades:
 * - Renderizar el documento react-pdf a partir de una orden ya obtenida y
 *   convertirlo a Blob.
 * - Disparar la descarga nativa del navegador.
 *
 * Recibe la orden ya resuelta (no un id) para que quien la obtiene (el hook)
 * pueda reutilizar el cache de `usePurchaseOrder` en vez de que esta función
 * siempre dispare su propio fetch.
 */
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";
import { generatePurchaseOrderPdfBlob } from "./pdf/purchaseOrderPdfBlob";

/**
 * Descarga el PDF de la orden de compra indicada directamente desde el cliente.
 * No requiere API route ni funciones de servidor.
 */
export const downloadPurchaseOrderPdf = async (order: PurchaseOrderDetail): Promise<void> => {
  const blob = await generatePurchaseOrderPdfBlob(order);

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  // El folio es más legible que el id para el nombre del archivo; si por algún
  // motivo viene vacío, se cae al id para no generar "orden-compra-.pdf".
  link.download = `orden-compra-${order.folio || order.id}.pdf`;
  link.click();
  URL.revokeObjectURL(objectUrl);
};
