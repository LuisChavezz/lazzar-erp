import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { generateListPdfBlob, standardListPdfProps } from "@/src/utils/listPdfBlob";
import type { CustomerListItem } from "../interfaces/customer.interface";
import { getCustomerColumnText } from "../utils/customerExport";

const formatValue = (value: string): string => (value === "" ? "—" : value);

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
const customersPdfProps = (
  customers: CustomerListItem[],
  columns: DataTableVisibleColumn<CustomerListItem>[],
  now: Date,
) => {
  // Todas las columnas del mismo ancho.
  const widths = columns.map(() => `${(100 / columns.length).toFixed(1)}%`);
  return standardListPdfProps({
    title: "Reporte de Clientes",
    columns: columns.map((column, i) => ({ header: column.header, width: widths[i] })),
    rows: customers.map((customer) => columns.map((column) => formatValue(getCustomerColumnText(customer, column)))),
    now,
  });
};

/**
 * Exporta el listado de clientes a PDF con las columnas visibles.
 * `@react-pdf/renderer` se importa dinámicamente (solo al exportar) y el
 * disparo llega por un `CustomEvent` propio (`customers:exportPDF`).
 *
 * `getRows` trae, AL EXPORTAR, TODAS las filas de los criterios vigentes de la
 * tabla (búsqueda y orden), página por página desde el backend (`fetchAllRows`
 * de `useServerTable`). Un fallo (al pedir las filas o al cargar el chunk de
 * react-pdf) lo avisa `useServerExport` con un toast de error. Mismo patrón
 * que `useSupplierPdfExport`.
 */
export const useCustomerPdfExport = (
  getRows: () => Promise<CustomerListItem[]>,
  columns: DataTableVisibleColumn<CustomerListItem>[],
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const runExport = useServerExport(getRows, "customers-export-pdf");

  const exportToPdf = useCallback(async () => {
    const exportColumns = columnsRef.current;
    if (exportColumns.length === 0) return;
    await runExport(async (rows) => {
      const now = new Date();
      const blob = await generateListPdfBlob(customersPdfProps(rows, exportColumns, now));
      downloadBlob(blob, datedFileName("clientes", "pdf", now));
    });
  }, [runExport]);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("customers:exportPDF", handleExport);
    return () => {
      document.removeEventListener("customers:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
