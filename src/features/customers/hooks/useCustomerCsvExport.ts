import { useCallback, useEffect, useRef } from "react";
import { Customer } from "../interfaces/customer.interface";
import { DataTableVisibleColumn } from "@/src/components/DataTable";

const escapeCsv = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const getValueByPath = (value: unknown, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
};

const getColumnValue = (
  customer: Customer,
  column: DataTableVisibleColumn<Customer>,
  index: number
) => {
  if (column.accessorFn) {
    return column.accessorFn(customer, index);
  }
  if (column.accessorKey) {
    return getValueByPath(customer, column.accessorKey);
  }
  return (customer as unknown as Record<string, unknown>)[column.id];
};

const buildCsv = (customers: Customer[], columns: DataTableVisibleColumn<Customer>[]) => {
  const headers = columns.map((column) => column.header);
  const rows = customers.map((customer, index) =>
    columns.map((column) => {
      const value = getColumnValue(customer, column, index);
      return value === null || value === undefined ? "" : String(value);
    })
  );

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
};

/**
 * `getCustomers` se invoca AL EXPORTAR (no al montar): son las filas
 * filtradas y ordenadas que `DataTable` expone por `ref` (`getFilteredRows`),
 * leídas en ese instante. Guardar una copia en un ref dejaba en el archivo
 * valores y orden viejos tras un refetch que no cambiaba el número de filas.
 */
export const useCustomerCsvExport = (
  getCustomers: () => Customer[],
  columns: DataTableVisibleColumn<Customer>[]
) => {
  const getCustomersRef = useRef(getCustomers);
  const columnsRef = useRef(columns);

  useEffect(() => {
    getCustomersRef.current = getCustomers;
  }, [getCustomers]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToCsv = useCallback(() => {
    if (columnsRef.current.length === 0) return;
    const csvContent = buildCsv(getCustomersRef.current(), columnsRef.current);
    const blob = new Blob([`﻿${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `clientes-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleExport = () => exportToCsv();
    document.addEventListener("customers:exportCSV", handleExport);
    return () => {
      document.removeEventListener("customers:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
