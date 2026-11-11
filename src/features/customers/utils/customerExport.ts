import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { CustomerListItem } from "../interfaces/customer.interface";
import { formatUltimaCompra } from "./ultimaCompra";

/**
 * Texto plano por columna para los reportes CSV y PDF del listado de clientes
 * (`useCustomerCsvExport`/`useCustomerPdfExport`). Cada `column.id` de
 * `getCustomerColumns` se mapea aquí a su valor de forma explícita, como en
 * `supplierExport.ts`: una columna nueva (o un id renombrado) que no se agregue
 * a este `switch` sale vacía, en vez de leer por casualidad un campo del mismo
 * nombre. "Última Compra" sale con el mismo texto que la celda. Vacío = "" (el
 * PDF lo pinta como "—").
 */
export const getCustomerColumnText = (
  customer: CustomerListItem,
  column: DataTableVisibleColumn<CustomerListItem>,
): string => {
  switch (column.id) {
    case "razon_social":
      return customer.razon_social ?? "";
    case "nombre":
      return customer.nombre ?? "";
    case "telefono":
      return customer.telefono ?? "";
    case "correo":
      return customer.correo ?? "";
    case "ultima_compra":
      return formatUltimaCompra(customer.fecha_ultima_compra);
    default:
      return "";
  }
};
