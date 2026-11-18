"use client";

import { CfdiDownloadButton } from "@/src/components/CfdiDownloadButton";
import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import { getFacturamaCfdiFile } from "@/src/features/facturama/services/actions";
import { useOfficialCfdiDownload } from "@/src/hooks/useOfficialCfdiDownload";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { documentPdfFolioLabel } from "@/src/pdfs/shared/documentPdfModel";
import { officialCfdiFileName, type CfdiFileFormat } from "@/src/utils/officialCfdiFile";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import { generateCreditNotePdfBlob } from "../services/pdf/creditNotePdfBlob";
import { creditNotePdfDescriptor, hasCreditNoteCfdi } from "../utils/creditNotePdf";
import { creditNotePdfSource } from "../utils/creditNotePdfSource";

type CreditNotePdfTarget = Pick<NotaCredito, "id" | "folio" | "estatus" | "cfdi_uuid" | "facturama_id">;

/**
 * "Descargar CFDI (PDF)" / "(XML)" de una nota timbrada (EC-859): los archivos
 * OFICIALES del CFDI de egreso por el passthrough de Facturama (la nota no
 * tiene `cfdi/` propio), como `NC-<folio>-CFDI.pdf` / `.xml`.
 */
function CreditNoteCfdiButton({ nota, format }: { nota: CreditNotePdfTarget; format: CfdiFileFormat }) {
  const facturamaId = nota.facturama_id;
  const { download, isDownloading } = useOfficialCfdiDownload({
    mutationKey: ["download-credit-note-cfdi", nota.id, format],
    format,
    fetchFile: hasCreditNoteCfdi(nota) && facturamaId ? () => getFacturamaCfdiFile(facturamaId, format) : null,
    fileName: officialCfdiFileName(documentPdfFileName("NC", nota.folio, nota.id), format),
    ofDocument: "de la nota de crédito",
  });
  return (
    <CfdiDownloadButton
      format={format}
      download={download}
      isDownloading={isDownloading}
      folioLabel={documentPdfFolioLabel(nota.folio, nota.id)}
      compact
    />
  );
}

/**
 * Acciones de documento de una nota de crédito (EC-859), junto al título de
 * sus dos diálogos de detalle (`headerAction`): "Descargar PDF" en todo estatus
 * y, si está timbrada, "Descargar CFDI (PDF)" y "(XML)".
 */
export function CreditNotePdfActions({ nota }: { nota: CreditNotePdfTarget }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasCreditNoteCfdi(nota) && (
        <>
          <CreditNoteCfdiButton nota={nota} format="pdf" />
          <CreditNoteCfdiButton nota={nota} format="xml" />
        </>
      )}
      <DocumentPdfButton
        descriptor={creditNotePdfDescriptor(nota)}
        source={creditNotePdfSource({ notaId: nota.id, render: generateCreditNotePdfBlob })}
        compact
      />
    </div>
  );
}
