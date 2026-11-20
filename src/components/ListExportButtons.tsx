"use client";

import { Button } from "@/src/components/Button";
import { ExportCsvIcon, ExportPdfIcon } from "@/src/components/Icons";

interface ListExportButtonsProps {
  /** Qué se exporta, para el nombre accesible ("recepciones"). */
  subject: string;
  onExcel: () => void;
  onPdf: () => void;
}

/** Botones Excel (verde) y PDF (rojo) del toolbar de un listado. */
export function ListExportButtons({ subject, onExcel, onPdf }: ListExportButtonsProps) {
  return (
    <>
      <Button
        variant="success"
        size="icon"
        onClick={onExcel}
        title="Exportar a Excel con los filtros aplicados"
        aria-label={`Exportar ${subject} a Excel`}
      >
        <ExportCsvIcon className="w-4 h-4 shrink-0" />
      </Button>
      <Button
        variant="danger"
        size="icon"
        onClick={onPdf}
        title="Exportar a PDF con los filtros aplicados"
        aria-label={`Exportar ${subject} a PDF`}
      >
        <ExportPdfIcon className="w-4 h-4 shrink-0" />
      </Button>
    </>
  );
}
