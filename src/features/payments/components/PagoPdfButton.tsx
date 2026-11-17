"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { Pago } from "../interfaces/payment.interface";
import { generatePagoPdfBlob } from "../services/pdf/pagoPdfBlob";
import { pagoPdfDescriptor } from "../utils/pagoPdf";
import { pagoPdfSource } from "../utils/pagoPdfSource";

/** "Descargar PDF" de un pago a proveedor (EC-859), junto al título de `PaymentDetailDialog`, en todo estatus. */
export function PagoPdfButton({ pago }: { pago: Pick<Pago, "id" | "estatus"> }) {
  return (
    <DocumentPdfButton
      descriptor={pagoPdfDescriptor(pago)}
      source={pagoPdfSource({ pagoId: pago.id, render: generatePagoPdfBlob })}
      compact
    />
  );
}
