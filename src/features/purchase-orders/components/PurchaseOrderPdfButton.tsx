"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import { renderedDocumentPdfSource } from "@/src/hooks/useDocumentPdfDownload";
import { purchaseOrderQueryOptions } from "../hooks/usePurchaseOrder";
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";
import { generatePurchaseOrderPdfBlob } from "../services/pdf/purchaseOrderPdfBlob";
import { purchaseOrderPdfDescriptor } from "../utils/purchaseOrderPdfDescriptor";

/**
 * "Descargar PDF" de una orden de compra (EC-855), en el encabezado de su
 * página y de su diálogo de detalle. Disponible en los seis estatus.
 *
 * El PDF NO se arma con la orden que ya muestra la pantalla: se vuelve a pedir
 * el detalle (`staleTime: 0` fuerza el GET), porque el documento depende del
 * `estatus` REAL —una orden recién cancelada debe salir con su marca aunque el
 * detalle cacheado (hasta 15 min) diga todavía "autorizada"— y el folio puede
 * haberse asignado mientras tanto. Esa respuesta ya viene filtrada por rol:
 * sin permiso de importes, el PDF sale sin ellos.
 */
export function PurchaseOrderPdfButton({
  order,
  compact,
}: {
  order: PurchaseOrderDetail;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();

  const source = renderedDocumentPdfSource({
    fetchDetail: () =>
      queryClient.fetchQuery({ ...purchaseOrderQueryOptions(order.id), staleTime: 0 }),
    describe: purchaseOrderPdfDescriptor,
    render: (detail, { company }) => generatePurchaseOrderPdfBlob(detail, company),
  });

  return (
    <DocumentPdfButton
      document={purchaseOrderPdfDescriptor(order)}
      source={source}
      compact={compact}
    />
  );
}
