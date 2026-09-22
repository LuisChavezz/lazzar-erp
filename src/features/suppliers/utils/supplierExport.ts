import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { Supplier } from "../interfaces/supplier.interface";

/**
 * Texto plano por columna para los reportes CSV y PDF del catálogo
 * (`useSupplierCsvExport`/`useSupplierPdfExport`). "Proveedor" y "Contacto"
 * son columnas compuestas pensadas para pantalla (código+nombre;
 * correo+teléfono, ver `SupplierColumns`), no para una celda de reporte —
 * aquí se arma su propia representación de texto por `column.id`. Mismo
 * criterio que `purchaseOrderExport.ts`.
 */
export const getSupplierColumnText = (
  supplier: Supplier,
  column: DataTableVisibleColumn<Supplier>,
): string => {
  switch (column.id) {
    case "proveedor":
      return [supplier.codigo, supplier.nombre].filter(Boolean).join(" — ");
    case "contacto":
      return [supplier.email, supplier.telefono].filter(Boolean).join(" / ");
    default:
      return String((supplier as unknown as Record<string, unknown>)[column.id] ?? "");
  }
};
