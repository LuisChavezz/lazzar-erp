"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { Picking } from "../interfaces/picking.interface";
import { generatePickingPdfBlob } from "../services/pdf/pickingPdfBlob";
import { pickingPdfDescriptor } from "../utils/pickingPdf";
import { pickingPdfSource } from "../utils/pickingPdfSource";

/**
 * "Descargar PDF" de un surtido (EC-858), junto al título de sus dos diálogos de
 * detalle: `PickingDetailDialog` (listado de picking) y `PickingDetailByIdDialog`
 * (detalle del pedido y bitácora de documentos).
 */
export function PickingPdfButton({ picking }: { picking: Pick<Picking, "id" | "folio" | "estado"> }) {
  return (
    <DocumentPdfButton
      descriptor={pickingPdfDescriptor(picking)}
      source={pickingPdfSource({ pickingId: picking.id, render: generatePickingPdfBlob })}
      compact
    />
  );
}
