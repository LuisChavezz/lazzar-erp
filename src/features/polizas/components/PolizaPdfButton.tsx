"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { Poliza } from "../interfaces/poliza.interface";
import { generatePolizaPdfBlob } from "../services/pdf/polizaPdfBlob";
import { polizaPdfDescriptor } from "../utils/polizaPdf";
import { polizaPdfSource } from "../utils/polizaPdfSource";

/** "Descargar PDF" de una póliza (EC-859), junto al título de `PolizaDetailDialog`, en todo estatus. */
export function PolizaPdfButton({ poliza }: { poliza: Pick<Poliza, "id" | "folio" | "estatus"> }) {
  return (
    <DocumentPdfButton
      descriptor={polizaPdfDescriptor(poliza)}
      source={polizaPdfSource({ polizaId: poliza.id, render: generatePolizaPdfBlob })}
      compact
    />
  );
}
