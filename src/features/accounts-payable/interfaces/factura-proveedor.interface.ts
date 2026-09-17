/**
 * Re-exporta los tipos de facturas de proveedor desde su módulo dueño.
 *
 * Vivían aquí mientras `accounts-payable` era el único que leía facturas (para
 * el selector del alta manual de CxP). Al nacer `features/supplier-invoices/` se
 * mudaron allá, tal como anunciaba el comentario original; este archivo queda
 * como puente para que los consumidores de `accounts-payable` sigan compilando
 * sin tocar sus imports.
 */
export type {
  FacturaProveedor,
  FacturaProveedorDetalle,
  FacturaProveedorEstatus,
  FacturaProveedorQueryParams,
} from "@/src/features/supplier-invoices/interfaces/supplier-invoice.interface";
