"use client";

import { Button } from "@/src/components/Button";
import { DownloadIcon, LoadingSpinnerIcon } from "@/src/components/Icons";
import { useDocumentPdfDownload } from "@/src/hooks/useDocumentPdfDownload";
import type { DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import {
  documentPdfFolioLabel,
  type DocumentPdfDescriptor,
} from "@/src/pdfs/shared/documentPdfModel";

interface DocumentPdfButtonProps {
  /** Identidad del documento tal como se ve en pantalla (para la etiqueta accesible). */
  descriptor: DocumentPdfDescriptor;
  /** De dónde sale el PDF; ver `DocumentPdfSource`. */
  source: DocumentPdfSource;
  /**
   * Versión compacta para el encabezado de un diálogo. En la barra de acciones
   * de una página va el tamaño normal, junto a los demás botones.
   */
  compact?: boolean;
}

/**
 * Botón "Descargar PDF" único para todos los documentos (EC-855). Va SIEMPRE
 * en el encabezado del detalle: alineado a la derecha en la barra de acciones
 * de una página, junto al título en un diálogo (`MainDialog` `headerAction`).
 *
 * No comprueba permisos: solo se monta dentro de una vista de detalle, que ya
 * pasó su puerta. Lo que el usuario no puede ver del documento lo resuelve la
 * fuente, que arma el PDF con la respuesta YA filtrada del backend.
 */
export function DocumentPdfButton({ descriptor, source, compact = false }: DocumentPdfButtonProps) {
  const { download, isPending, companyPending } = useDocumentPdfDownload(descriptor, source);
  const folioLabel = documentPdfFolioLabel(descriptor.folio, descriptor.id);

  return (
    <Button
      variant="secondary"
      onClick={download}
      disabled={isPending || companyPending}
      aria-busy={isPending || undefined}
      aria-label={isPending ? `Generando PDF de ${folioLabel}` : `Descargar PDF de ${folioLabel}`}
      title={companyPending ? "Cargando los datos de la empresa…" : undefined}
      className={compact ? "px-3! py-1.5! text-xs!" : undefined}
    >
      {isPending ? (
        <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <DownloadIcon className="w-4 h-4" aria-hidden="true" />
      )}
      {isPending ? "Generando PDF..." : "Descargar PDF"}
    </Button>
  );
}
