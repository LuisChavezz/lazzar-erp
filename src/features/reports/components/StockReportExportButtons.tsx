"use client";

import { Button } from "@/src/components/Button";
import { DownloadIcon } from "@/src/components/Icons";
import {
  STOCK_REPORT_EXPORT_FORMAT_LABEL,
  type StockReportExportFormat,
} from "@/src/features/stock/utils/stockReportExport";

const FORMATS: readonly StockReportExportFormat[] = ["pdf", "xlsx"];

interface StockReportExportButtonsProps {
  /** Descarga en curso por formato: deshabilita solo ese botón. */
  isExporting: Record<StockReportExportFormat, boolean>;
  onExport: (formato: StockReportExportFormat) => void;
}

/**
 * Botones "PDF" y "Excel" de los reportes por periodo (EC-819), para el
 * `actionButton` del `DataTable`. Cada uno descarga el reporte COMPLETO (todas
 * las páginas) que genera el backend; quien los monta decide cuándo se muestran.
 */
export function StockReportExportButtons({ isExporting, onExport }: StockReportExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {FORMATS.map((formato) => {
        const label = STOCK_REPORT_EXPORT_FORMAT_LABEL[formato];
        const pending = isExporting[formato];
        return (
          <Button
            key={formato}
            variant="secondary"
            leftIcon={<DownloadIcon className="w-4 h-4 shrink-0" />}
            onClick={() => onExport(formato)}
            disabled={pending}
            aria-busy={pending || undefined}
            aria-label={`Descargar el reporte completo en ${label}`}
            title={`Descargar todo el reporte (todas las páginas) en ${label}`}
          >
            {pending ? `Generando ${label}...` : label}
          </Button>
        );
      })}
    </div>
  );
}
