/**
 * PDF del listado exportado (EC-959): de las filas y las columnas visibles a las
 * props de `ListPdfDocument` (variante `standard`). Sin React ni react-pdf, para
 * probarlo en `tests/unit/`; lo usa `useSupplierPdfExport`.
 */
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { Supplier } from "../interfaces/supplier.interface";
import { getSupplierColumnText } from "./supplierExport";
import { listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";

/** Ancho relativo de cada columna en el PDF — Proveedor/Razón social llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<Supplier>): number => {
  if (column.id === "proveedor") return 1.6;
  if (column.id === "razon_social") return 1.8;
  if (column.id === "contacto") return 1.6;
  return 1;
};

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
export const suppliersPdfProps = (
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
