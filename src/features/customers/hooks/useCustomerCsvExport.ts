import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import { downloadBlob } from "@/src/utils/downloadBlob";
import type { CustomerListItem } from "../interfaces/customer.interface";
import { getCustomerColumnText } from "../utils/customerExport";

const escapeCsv = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildCsv = (
  customers: CustomerListItem[],
  columns: DataTableVisibleColumn<CustomerListItem>[],
) => {
  const headers = columns.map((column) => column.header);
  const rows = customers.map((customer) =>
    columns.map((column) => getCustomerColumnText(customer, column)),
  );
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

/**
 * Exporta el listado de clientes a un CSV que Excel abre directamente, con las
 * columnas visibles. Disparo por `CustomEvent` (`customers:exportCSV`).
 *
 * `getRows` trae, AL EXPORTAR, TODAS las filas de los criterios vigentes de la
 * tabla (búsqueda y orden), página por página desde el backend (`fetchAllRows`
 * de `useServerTable`): la tabla en modo servidor solo tiene la página
 * visible. Mismo patrón que `useSupplierCsvExport`.
 */
export const useCustomerCsvExport = (
  getRows: () => Promise<CustomerListItem[]>,
  columns: DataTableVisibleColumn<CustomerListItem>[],
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const runExport = useServerExport(getRows, "customers-export-csv");

  const exportToCsv = useCallback(async () => {
    const exportColumns = columnsRef.current;
    if (exportColumns.length === 0) return;
    await runExport(async (rows) => {
      const csvContent = buildCsv(rows, exportColumns);
      // BOM para que Excel detecte UTF-8 y no rompa acentos/ñ.
      const blob = new Blob([`\uFEFF${csvContent}`], {
        type: "text/csv;charset=utf-8;",
      });
      downloadBlob(blob, datedFileName("clientes", "csv"));
    });
  }, [runExport]);

  useEffect(() => {
    const handleExport = () => {
      void exportToCsv();
    };
    document.addEventListener("customers:exportCSV", handleExport);
    return () => {
      document.removeEventListener("customers:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
