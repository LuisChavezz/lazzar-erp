"use client";

import { useServerExport } from "@/src/hooks/useServerExport";
import { datedFileName } from "@/src/utils/datedFileName";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { buildListCsv, type ListExportColumn } from "@/src/utils/listExport";
import { compactListPdfProps, generateListPdfBlob } from "@/src/utils/listPdfBlob";

interface ListExportOptions<T> {
  /** Filas a exportar, leídas AL EXPORTAR: `getFilteredRows` del ref en modo
   *  cliente o `fetchAllRows` de `useServerTable` en modo servidor. */
  getRows: () => T[] | Promise<T[]>;
  columns: readonly ListExportColumn<T>[];
  /** Título del PDF ("Recepciones"). */
  title: string;
  /** Prefijo del archivo: `<fileName>-AAAA-MM-DD.csv|pdf`. */
  fileName: string;
  /** Línea de conteo del encabezado del PDF; por defecto "N registros". */
  summary?: (rows: T[]) => string;
}

/**
 * Excel (CSV) y PDF de un listado con EXACTAMENTE las filas que deja ver la
 * tabla (filtros de encabezado, búsqueda y orden vigentes). El toast de
 * progreso y el candado contra doble clic vienen de `useServerExport`, que
 * también muestra un fallo del PDF (p. ej. la fuente, EC-942). El PDF es la
 * variante `compact` de `ListPdfDocument` (EC-959).
 */
export const useListExport = <T,>(options: ListExportOptions<T>) => {
  const { getRows, fileName } = options;
  const runCsv = useServerExport(async () => getRows(), `${fileName}-export-csv`);
  const runPdf = useServerExport(async () => getRows(), `${fileName}-export-pdf`);

  const exportCsv = () =>
    runCsv((rows) => {
      const blob = new Blob([buildListCsv(options.columns, rows)], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, datedFileName(fileName, "csv"));
    });

  const exportPdf = () =>
    runPdf(async (rows) => {
      const now = new Date();
      const blob = await generateListPdfBlob(compactListPdfProps(options, rows, now));
      downloadBlob(blob, datedFileName(fileName, "pdf", now));
    });

  return { exportCsv, exportPdf };
};
