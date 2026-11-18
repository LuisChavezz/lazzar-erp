"use client";

import { Button } from "@/src/components/Button";
import { LoadingSpinnerIcon, ShieldCheckIcon } from "@/src/components/Icons";
import type { CfdiFileFormat } from "@/src/utils/officialCfdiFile";

const FORMAT_LABELS: Record<CfdiFileFormat, string> = { pdf: "PDF", xml: "XML" };

interface CfdiDownloadButtonProps {
  /** Archivo que baja este botón: el PDF o el XML del CFDI. */
  format: CfdiFileFormat;
  /** De `useOfficialCfdiDownload`. */
  download: () => void;
  isDownloading: boolean;
  /** Para la etiqueta accesible ("Descargar CFDI de F-00094"). */
  folioLabel: string;
  /** Versión compacta, para el encabezado de un diálogo junto a `DocumentPdfButton compact`. */
  compact?: boolean;
}

/**
 * "Descargar CFDI (PDF)" / "(XML)" (EC-859): un archivo OFICIAL timbrado de
 * Facturama, aparte de "Descargar PDF" (el documento que arma el ERP). Van en
 * pareja, como las descargas del REP, junto a `DocumentPdfButton`, y solo se
 * montan cuando el documento está timbrado; el dato y el candado (uno por
 * formato) los da `useOfficialCfdiDownload`.
 */
export function CfdiDownloadButton({
  format,
  download,
  isDownloading,
  folioLabel,
  compact = false,
}: CfdiDownloadButtonProps) {
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
