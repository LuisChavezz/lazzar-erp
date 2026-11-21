import SupplierInvoiceList from "@/src/features/supplier-invoices/components/SupplierInvoiceList";
import {
  parseSupplierInvoicesFactura,
  parseSupplierInvoicesProveedor,
  parseSupplierInvoicesSalidaMaquila,
  supplierInvoiceToOpen,
} from "@/src/features/supplier-invoices/utils/supplierInvoicesListQuery";

/**
 * Facturas de proveedor (EC-142). Sin regla propia de permisos: la cubre el
 * catch-all `/finance` → `R-CONTABILIDAD`.
 *
 * `?proveedor=<id>` preselecciona el proveedor al entrar: lo pone el "Volver"
 * del detalle de OC (origen `supplier-invoices`). `?salida_maquila=<id>` lista
 * las facturas de maquila de esa SM y `?factura=<id>` abre su detalle: los pone
 * el detalle de la SM (EC-919). Se validan aquí; un valor inválido se trata
 * como ausente, y `?factura=` sin ningún filtro se ignora.
 */
export default async function SupplierInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { proveedor, salida_maquila, factura } = await searchParams;
  const proveedorId = parseSupplierInvoicesProveedor(proveedor);
  const salidaMaquilaId = parseSupplierInvoicesSalidaMaquila(salida_maquila);

  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <SupplierInvoiceList
        initialProveedorId={proveedorId ?? 0}
        initialSalidaMaquilaId={salidaMaquilaId}
        initialFacturaId={supplierInvoiceToOpen({
          proveedorId,
          salidaMaquilaId,
          facturaId: parseSupplierInvoicesFactura(factura),
        })}
      />
    </div>
  );
}
