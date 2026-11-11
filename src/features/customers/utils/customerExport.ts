import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { CustomerListItem } from "../interfaces/customer.interface";
import { formatUltimaCompra } from "./customerList";

/**
 * Texto plano por columna para los reportes CSV y PDF del listado de clientes
 * (`useCustomerCsvExport`/`useCustomerPdfExport`), por `column.id`. "Última
 * Compra" sale con el mismo texto que la celda (`formatUltimaCompra`): la
 * fecha-calendario o "Sin compras". Vacío = "" (el PDF lo pinta como "—").
 */
export const getCustomerColumnText = (
  customer: CustomerListItem,
  column: DataTableVisibleColumn<CustomerListItem>,
): string => {
  if (column.id === "ultima_compra") return formatUltimaCompra(customer.fecha_ultima_compra);
  const value = (customer as unknown as Record<string, unknown>)[column.id];
  return value === null || value === undefined ? "" : String(value);
};
