"use client";

import { CfdiDownloadButton } from "@/src/components/CfdiDownloadButton";
import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import { getFacturamaCfdiFile } from "@/src/features/facturama/services/actions";
import { useOfficialCfdiDownload } from "@/src/hooks/useOfficialCfdiDownload";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { documentPdfFolioLabel } from "@/src/pdfs/shared/documentPdfModel";
import { officialCfdiFileName } from "@/src/utils/officialCfdiFile";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import { generateCreditNotePdfBlob } from "../services/pdf/creditNotePdfBlob";
import { creditNotePdfDescriptor, hasCreditNoteCfdi } from "../utils/creditNotePdf";
import { creditNotePdfSource } from "../utils/creditNotePdfSource";

type CreditNotePdfTarget = Pick<NotaCredito, "id" | "folio" | "estatus" | "cfdi_uuid" | "facturama_id">;

/**
 * "Descargar CFDI" de una nota timbrada (EC-859): el PDF OFICIAL del CFDI de
 * egreso por el passthrough de Facturama (la nota no tiene `cfdi/` propio),
 * como `NC-<folio>-CFDI.pdf`.
 */
function CreditNoteCfdiButton({ nota }: { nota: CreditNotePdfTarget }) {
  const facturamaId = nota.facturama_id;
  const { download, isDownloading } = useOfficialCfdiDownload({
    mutationKey: ["download-credit-note-cfdi", nota.id, "pdf"],
    format: "pdf",
    fetchFile: hasCreditNoteCfdi(nota) && facturamaId ? () => getFacturamaCfdiFile(facturamaId, "pdf") : null,
    fileName: officialCfdiFileName(documentPdfFileName("NC", nota.folio, nota.id)),
    ofDocument: "de la nota de crédito",
  });
  return (
    <CfdiDownloadButton
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
 * y, si está timbrada, "Descargar CFDI".
 */
export function CreditNotePdfActions({ nota }: { nota: CreditNotePdfTarget }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasCreditNoteCfdi(nota) && <CreditNoteCfdiButton nota={nota} />}
      <DocumentPdfButton
        descriptor={creditNotePdfDescriptor(nota)}
        source={creditNotePdfSource({ notaId: nota.id, render: generateCreditNotePdfBlob })}
        compact
      />
    </div>
  );
}
