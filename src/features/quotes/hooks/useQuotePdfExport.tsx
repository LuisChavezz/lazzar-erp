import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import { Quote } from "../interfaces/quote.interface";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { useServerExport } from "@/src/hooks/useServerExport";
import { generateListPdfBlob } from "@/src/utils/listPdfBlob";
import { quotesPdfProps } from "../utils/quoteListPdf";

/**
 * PDF del listado en MODO SERVIDOR: AL EXPORTAR (no al montar) `getRows` trae
 * TODAS las filas de los criterios vigentes, página por página desde el
 * backend (`fetchAllRows` de `useServerTable`): la tabla solo tiene la página
 * visible. `useServerExport` muestra el progreso, ignora un doble disparo y
 * avisa si falla el pedido de filas o el render del PDF (p. ej. al descargar
 * el chunk de react-pdf o la fuente, EC-942).
 */
export const useQuotePdfExport = (
  getRows: () => Promise<Quote[]>,
  columns: DataTableVisibleColumn<Quote>[]
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const runExport = useServerExport(getRows, "quotes-export-pdf");

  const exportToPdf = useCallback(async () => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    await runExport(async (rows) => {
      const now = new Date();
      const blob = await generateListPdfBlob(quotesPdfProps(rows, exportColumns, now));
      downloadBlob(blob, datedFileName("quotes", "pdf", now));
    });
  }, [runExport]);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("quotes:exportPDF", handleExport);
    return () => {
      document.removeEventListener("quotes:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
