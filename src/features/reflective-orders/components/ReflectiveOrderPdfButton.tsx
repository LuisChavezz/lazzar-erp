"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { ReflectiveOrderDetail } from "../interfaces/reflective-order.interface";
import { generateReflectiveOrderPdfBlob } from "../services/pdf/reflectiveOrderPdfBlob";
import { reflectiveOrderPdfDescriptor } from "../utils/reflectiveOrderPdf";
import { reflectiveOrderPdfSource } from "../utils/reflectiveOrderPdfSource";

/**
 * "Descargar PDF" de una orden de reflejante (EC-857), en la barra superior de
 * su página de detalle (`WorkOrderTopBar` `actions`). Solo en la página: no va
 * en `ReflectiveOrderDetailDialog`.
 */
export function ReflectiveOrderPdfButton({
  order,
}: {
  order: Pick<ReflectiveOrderDetail, "id" | "folio_reflejante" | "estatus_reflejante">;
}) {
  return (
    <DocumentPdfButton
      descriptor={reflectiveOrderPdfDescriptor(order)}
      source={reflectiveOrderPdfSource({ orderId: order.id, render: generateReflectiveOrderPdfBlob })}
    />
  );
}
