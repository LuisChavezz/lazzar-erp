"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { Packing } from "../interfaces/packing.interface";
import { generatePackingPdfBlob } from "../services/pdf/packingPdfBlob";
import { packingPdfDescriptor } from "../utils/packingPdf";
import { packingPdfSource } from "../utils/packingPdfSource";

/**
 * "Descargar PDF" de un embarque (EC-858), junto al título de sus dos diálogos
 * de detalle: `PackingDetailDialog` (listado de packing) y
 * `PackingDetailByIdDialog` (detalle del pedido y bitácora de documentos).
 */
export function PackingPdfButton({ packing }: { packing: Pick<Packing, "id" | "folio" | "estado"> }) {
  return (
    <DocumentPdfButton
      descriptor={packingPdfDescriptor(packing)}
      source={packingPdfSource({ packingId: packing.id, render: generatePackingPdfBlob })}
      compact
    />
  );
}
