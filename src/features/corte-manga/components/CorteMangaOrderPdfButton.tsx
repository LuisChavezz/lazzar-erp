"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";
import { generateCorteMangaOrderPdfBlob } from "../services/pdf/corteMangaOrderPdfBlob";
import { corteMangaOrderPdfDescriptor } from "../utils/corteMangaOrderPdf";
import { corteMangaOrderPdfSource } from "../utils/corteMangaOrderPdfSource";

/**
 * "Descargar PDF" de una orden de corte de manga (EC-857), en la barra superior
 * de su página de detalle (`WorkOrderTopBar` `actions`). Solo en la página: no
 * va en `CorteMangaOrderDetailDialog` ni en `CorteMangaOrderDetailByIdDialog`.
 */
export function CorteMangaOrderPdfButton({
  order,
}: {
  order: Pick<CorteMangaOrder, "id" | "folio_ocm" | "estatus_corte">;
}) {
  return (
    <DocumentPdfButton
      descriptor={corteMangaOrderPdfDescriptor(order)}
      source={corteMangaOrderPdfSource({ orderId: order.id, render: generateCorteMangaOrderPdfBlob })}
    />
  );
}
