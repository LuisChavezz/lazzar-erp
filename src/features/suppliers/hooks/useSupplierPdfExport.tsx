import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import type { Supplier } from "../interfaces/supplier.interface";
import { getSupplierColumnText } from "../utils/supplierExport";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { generateListPdfBlob, listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";

/** Ancho relativo de cada columna en el PDF — Proveedor/Razón social llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<Supplier>): number => {
  if (column.id === "proveedor") return 1.6;
  if (column.id === "razon_social") return 1.8;
  if (column.id === "contacto") return 1.6;
  return 1;
};

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
const suppliersPdfProps = (
  suppliers: Supplier[],
  columns: DataTableVisibleColumn<Supplier>[],
  now: Date,
) => {
  const widths = listPdfWidths(columns.map(getColumnWeight), 1);
  return standardListPdfProps({
    title: "Catálogo de Proveedores",
    columns: columns.map((column, i) => ({ header: column.header, width: widths[i] })),
    rows: suppliers.map((supplier) => columns.map((column) => getSupplierColumnText(supplier, column))),
    now,
  });
};

/**
 * Exporta el catálogo VISIBLE de proveedores a PDF. Mismo patrón que
 * `usePurchaseOrderPdfExport`/`useQuotePdfExport`: `@react-pdf/renderer` se
 * importa dinámicamente (solo al exportar) y el disparo llega por un
 * `CustomEvent` propio (`suppliers:exportPDF`).
 *
 * `getRows` trae, AL EXPORTAR, TODAS las filas de los criterios vigentes de
 * la tabla (búsqueda y orden), página por página desde el backend
 * (`fetchAllRows` de `useServerTable`): la tabla en modo servidor solo tiene
 * la página visible.
 */
export const useSupplierPdfExport = (
  getRows: () => Promise<Supplier[]>,
  columns: DataTableVisibleColumn<Supplier>[],
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const runExport = useServerExport(getRows, "suppliers-export-pdf");

  const exportToPdf = useCallback(async () => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    await runExport(async (rows) => {
      const now = new Date();
      const blob = await generateListPdfBlob(suppliersPdfProps(rows, exportColumns, now));
      downloadBlob(blob, datedFileName("proveedores", "pdf", now));
    });
  }, [runExport]);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("suppliers:exportPDF", handleExport);
    return () => {
      document.removeEventListener("suppliers:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
