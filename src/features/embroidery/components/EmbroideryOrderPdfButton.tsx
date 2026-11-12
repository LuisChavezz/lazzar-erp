"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { EmbroideryOrderDetail } from "../interfaces/embroidery.interface";
import { generateEmbroideryOrderPdfBlob } from "../services/pdf/embroideryOrderPdfBlob";
import { embroideryOrderPdfDescriptor } from "../utils/embroideryOrderPdf";
import { embroideryOrderPdfSource } from "../utils/embroideryOrderPdfSource";

/**
 * "Descargar PDF" de una orden de bordado (EC-857), en la barra superior de su
 * página de detalle. Solo en la página: no va en `EmbroideryOrderDetailDialog`
 * (409 de duplicado ni pedido 360°).
 */
export function EmbroideryOrderPdfButton({
  order,
}: {
  order: Pick<EmbroideryOrderDetail, "id" | "folio_bordado" | "estatus_bordado">;
}) {
  return (
    <DocumentPdfButton
      descriptor={embroideryOrderPdfDescriptor(order)}
      source={embroideryOrderPdfSource({ orderId: order.id, render: generateEmbroideryOrderPdfBlob })}
    />
  );
}
