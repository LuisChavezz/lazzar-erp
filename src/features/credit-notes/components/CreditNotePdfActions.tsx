"use client";

import { OfficialCfdiButtons } from "@/src/components/OfficialCfdiButtons";
import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import { getFacturamaCfdiFile } from "@/src/features/facturama/services/actions";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { documentPdfFolioLabel } from "@/src/pdfs/shared/documentPdfModel";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import { generateCreditNotePdfBlob } from "../services/pdf/creditNotePdfBlob";
import { creditNotePdfDescriptor, hasCreditNoteCfdi } from "../utils/creditNotePdf";
import { creditNotePdfSource } from "../utils/creditNotePdfSource";

type CreditNotePdfTarget = Pick<NotaCredito, "id" | "folio" | "estatus" | "cfdi_uuid" | "facturama_id">;

/**
 * Acciones de documento de una nota de crédito (EC-859), junto al título de
 * sus dos diálogos de detalle (`headerAction`): "Descargar PDF" en todo estatus
 * y, si está timbrada, "Descargar CFDI (PDF)" y "(XML)": los archivos OFICIALES
 * del CFDI de egreso por el passthrough de Facturama (la nota no tiene `cfdi/`
 * propio), como `NC-<folio>-CFDI.pdf` / `.xml`.
 */
export function CreditNotePdfActions({ nota }: { nota: CreditNotePdfTarget }) {
  const facturamaId = nota.facturama_id;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasCreditNoteCfdi(nota) && (
        <OfficialCfdiButtons
          mutationKey={["download-credit-note-cfdi", nota.id]}
          fetchFile={facturamaId ? (format) => getFacturamaCfdiFile(facturamaId, format) : null}
          pdfFileName={documentPdfFileName("NC", nota.folio, nota.id)}
          ofDocument="de la nota de crédito"
          folioLabel={documentPdfFolioLabel(nota.folio, nota.id)}
          compact
        />
      )}
      <DocumentPdfButton
        descriptor={creditNotePdfDescriptor(nota)}
        source={creditNotePdfSource({ notaId: nota.id, render: generateCreditNotePdfBlob })}
        compact
      />
    </div>
  );
}
