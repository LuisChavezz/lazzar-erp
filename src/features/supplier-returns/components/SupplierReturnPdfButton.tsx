"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";
import { generateSupplierReturnPdfBlob } from "../services/pdf/supplierReturnPdfBlob";
import { supplierReturnPdfDescriptor } from "../utils/supplierReturnPdf";
import { supplierReturnPdfSource } from "../utils/supplierReturnPdfSource";

/**
 * "Descargar PDF" de una devolución a proveedor (EC-976), junto al título de
 * `SupplierReturnDetailDialog` (listado y bitácora). Lo ve quien puede leer el
 * detalle (`R-WMS-RECEPCIONES`), no solo quien puede cancelarla.
 */
export function SupplierReturnPdfButton({
  supplierReturn,
}: {
  supplierReturn: Pick<
    SupplierReturn,
    "id" | "folio" | "estatus" | "motivo_cancelacion" | "fecha_cancelacion" | "cancelado_por_nombre"
  >;
}) {
  return (
    <DocumentPdfButton
      descriptor={supplierReturnPdfDescriptor(supplierReturn)}
      source={supplierReturnPdfSource({ returnId: supplierReturn.id, render: generateSupplierReturnPdfBlob })}
      compact
    />
  );
}
