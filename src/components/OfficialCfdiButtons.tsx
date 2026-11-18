"use client";

import { Button } from "@/src/components/Button";
import type { QueryKey } from "@tanstack/react-query";
import { LoadingSpinnerIcon, ShieldCheckIcon } from "@/src/components/Icons";
import { useOfficialCfdiDownload } from "@/src/hooks/useOfficialCfdiDownload";
import { officialCfdiFileName, type CfdiFileFormat } from "@/src/utils/officialCfdiFile";

const FORMAT_LABELS: Record<CfdiFileFormat, string> = { pdf: "PDF", xml: "XML" };

interface OfficialCfdiButtonsProps {
  /** Prefijo del candado; se le agrega el formato (`[...mutationKey, "pdf"]`). */
  mutationKey: QueryKey;
  /** Pide el archivo de ese formato al backend; `null` si el documento no tiene CFDI. */
  fetchFile: ((format: CfdiFileFormat) => Promise<unknown>) | null;
  /** Nombre del PDF del ERP (`FAC-F-00094.pdf`); el CFDI se llama igual con `-CFDI`. */
  pdfFileName: string;
  /** Completa los mensajes de error: "de la factura", "de la nota de crédito"… */
  ofDocument: string;
  /** Para la etiqueta accesible ("Descargar CFDI (PDF) de F-00094"). */
  folioLabel: string;
  /** Versión compacta, para el encabezado de un diálogo junto a `DocumentPdfButton compact`. */
  compact?: boolean;
}

/**
 * "Descargar CFDI (PDF)" y "Descargar CFDI (XML)" (EC-859): los archivos
 * OFICIALES timbrados de Facturama, aparte de "Descargar PDF" (el documento que
 * arma el ERP), en pareja como las descargas del REP. Lo usan la factura y la
 * nota de crédito, que solo cambian el endpoint, el nombre y el texto; cada
 * formato tiene su candado (`useOfficialCfdiDownload`). Se monta solo cuando
 * el documento está timbrado.
 */
export function OfficialCfdiButtons(props: OfficialCfdiButtonsProps) {
  return (
    <>
      <CfdiDownloadButton {...props} format="pdf" />
      <CfdiDownloadButton {...props} format="xml" />
    </>
  );
}

function CfdiDownloadButton({
  format,
  mutationKey,
  fetchFile,
  pdfFileName,
  ofDocument,
  folioLabel,
  compact = false,
}: OfficialCfdiButtonsProps & { format: CfdiFileFormat }) {
  const { download, isDownloading } = useOfficialCfdiDownload({
    mutationKey: [...mutationKey, format],
    format,
    fetchFile: fetchFile ? () => fetchFile(format) : null,
    fileName: officialCfdiFileName(pdfFileName, format),
    ofDocument,
  });
  const label = `Descargar CFDI (${FORMAT_LABELS[format]})`;
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={download}
      disabled={isDownloading}
      aria-busy={isDownloading || undefined}
      aria-label={isDownloading ? `Descargando CFDI (${FORMAT_LABELS[format]}) de ${folioLabel}` : `${label} de ${folioLabel}`}
      className={compact ? "px-3! py-1.5! text-xs!" : undefined}
    >
      {isDownloading ? (
        <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <ShieldCheckIcon className="w-4 h-4" aria-hidden="true" />
      )}
      {isDownloading ? "Descargando CFDI..." : label}
    </Button>
  );
}
