"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { Cobro } from "../interfaces/collection.interface";
import { generateCobroPdfBlob } from "../services/pdf/cobroPdfBlob";
import { cobroPdfDescriptor } from "../utils/cobroPdf";
import { cobroPdfSource } from "../utils/cobroPdfSource";

/**
 * "Descargar PDF" de un cobro (EC-859), junto al título de
 * `CollectionDetailDialog`, en todo estatus. El REP timbrado se baja aparte,
 * en su sección ("Descargar PDF/XML del REP"): es el CFDI oficial.
 */
export function CobroPdfButton({ cobro }: { cobro: Pick<Cobro, "id" | "folio" | "estatus"> }) {
  return (
    <DocumentPdfButton
      descriptor={cobroPdfDescriptor(cobro)}
      source={cobroPdfSource({ cobroId: cobro.id, render: generateCobroPdfBlob })}
      compact
    />
  );
}
