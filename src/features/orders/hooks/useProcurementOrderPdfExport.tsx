import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import type { PedidoListItem } from "../interfaces/order.interface";
import type { PedidoExportRow } from "../interfaces/pedido-list.interface";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { generateListPdfBlob } from "@/src/utils/listPdfBlob";
import { procurementOrdersPdfProps } from "../utils/procurementOrderListPdf";

/**
 * Exporta a PDF los pedidos de Compras › Pedidos (modo servidor). Mismo patrón
 * que `usePurchaseOrderPdfExport`: `@react-pdf/renderer` se importa
 * dinámicamente (solo al exportar) y el disparo llega por un `CustomEvent`
 * propio (`procurement-orders:exportPDF`).
 *
 * `getRows` trae, AL EXPORTAR, TODO el conjunto de los criterios vigentes de la
 * tabla (búsqueda, filtros y orden) desde `GET /ventas/pedidos/exportar/`: la
 * tabla en modo servidor solo tiene la página visible. Las columnas son las
 * visibles de la tabla.
 */
export const useProcurementOrderPdfExport = (
  getRows: () => Promise<PedidoExportRow[]>,
  columns: DataTableVisibleColumn<PedidoListItem>[],
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const runExport = useServerExport(getRows, "procurement-orders-export-pdf");

  const exportToPdf = useCallback(async () => {
    const exportColumns = columnsRef.current;
    if (exportColumns.length === 0) return;
    // `runExport` muestra el progreso y convierte cualquier fallo (la petición
    // o el chunk de react-pdf) en un toast de error.
    await runExport(async (rows) => {
      const now = new Date();
      const blob = await generateListPdfBlob(procurementOrdersPdfProps(rows, exportColumns, now));
      downloadBlob(blob, datedFileName("pedidos", "pdf", now));
    });
  }, [runExport]);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("procurement-orders:exportPDF", handleExport);
    return () => {
      document.removeEventListener("procurement-orders:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
