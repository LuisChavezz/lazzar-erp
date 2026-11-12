"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import { renderedDocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";
import { getPurchaseOrder } from "../services/actions";
import { generatePurchaseOrderPdfBlob } from "../services/pdf/purchaseOrderPdfBlob";
import { purchaseOrderPdfDescriptor } from "../utils/purchaseOrderPdfDescriptor";

/**
 * "Descargar PDF" de una orden de compra (EC-855), en el encabezado de su
 * página y de su diálogo de detalle. Disponible en los seis estatus.
 *
 * El PDF NO se arma con la orden que ya muestra la pantalla: se vuelve a pedir
 * el detalle, porque el documento depende del `estatus` REAL —una orden recién
 * cancelada debe salir con su marca aunque el detalle cacheado (hasta 15 min)
 * diga todavía "autorizada"— y el folio puede haberse asignado mientras tanto.
 * Esa respuesta ya viene filtrada por rol: sin permiso de importes, el PDF sale
 * sin ellos. Se pide con el servicio y no con la caché de la orden (EC-856):
 * un fallo no debe repercutir en la pantalla que la observa.
 */
export function PurchaseOrderPdfButton({
  order,
  compact,
}: {
  order: PurchaseOrderDetail;
  compact?: boolean;
}) {
  const source = renderedDocumentPdfSource({
    fetchDetail: () => getPurchaseOrder(order.id),
    describe: purchaseOrderPdfDescriptor,
    render: (detail, { company }) => generatePurchaseOrderPdfBlob(detail, company),
  });

  return (
    <DocumentPdfButton
      descriptor={purchaseOrderPdfDescriptor(order)}
      source={source}
      compact={compact}
    />
  );
}
