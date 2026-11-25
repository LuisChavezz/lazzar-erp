/**
 * PDF del listado exportado (EC-959): de las filas y las columnas visibles a las
 * props de `ListPdfDocument` (variante `standard`). Sin React ni react-pdf, para
 * probarlo en `tests/unit/`; lo usa `useCustomerPdfExport`.
 */
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { CustomerListItem } from "../interfaces/customer.interface";
import { getCustomerColumnText } from "./customerExport";
import { standardListPdfProps } from "@/src/utils/listPdfBlob";

const formatValue = (value: string): string => (value === "" ? "—" : value);

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
export const customersPdfProps = (
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
