"use client";

import { Button } from "@/src/components/Button";
import { LoadingSpinnerIcon, ShieldCheckIcon } from "@/src/components/Icons";

interface CfdiDownloadButtonProps {
  /** De `useOfficialCfdiDownload`. */
  download: () => void;
  isDownloading: boolean;
  /** Para la etiqueta accesible ("Descargar CFDI de F-00094"). */
  folioLabel: string;
  /** Versión compacta, para el encabezado de un diálogo junto a `DocumentPdfButton compact`. */
  compact?: boolean;
}

/**
 * "Descargar CFDI" (EC-859): el PDF OFICIAL timbrado de Facturama, aparte de
 * "Descargar PDF" (el documento que arma el ERP). Va junto a `DocumentPdfButton`
 * y solo se monta cuando el documento está timbrado; el dato y el candado los
 * da `useOfficialCfdiDownload`.
 */
export function CfdiDownloadButton({ download, isDownloading, folioLabel, compact = false }: CfdiDownloadButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={download}
      disabled={isDownloading}
      aria-busy={isDownloading || undefined}
      aria-label={isDownloading ? `Descargando CFDI de ${folioLabel}` : `Descargar CFDI de ${folioLabel}`}
      className={compact ? "px-3! py-1.5! text-xs!" : undefined}
    >
      {isDownloading ? (
        <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <ShieldCheckIcon className="w-4 h-4" aria-hidden="true" />
      )}
      {isDownloading ? "Descargando CFDI..." : "Descargar CFDI"}
    </Button>
  );
}
