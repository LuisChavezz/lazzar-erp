import SupplierInvoiceList from "@/src/features/supplier-invoices/components/SupplierInvoiceList";
import { parseSupplierInvoicesProveedor } from "@/src/features/supplier-invoices/utils/supplierInvoicesListQuery";

/**
 * Facturas de proveedor (EC-142). Sin regla propia de permisos: la cubre el
 * catch-all `/finance` → `R-CONTABILIDAD`.
 *
 * `?proveedor=<id>` preselecciona el proveedor al entrar: lo pone el "Volver"
 * del detalle de OC (origen `supplier-invoices`). Se valida aquí; un valor
 * inválido se trata como ausente.
 */
export default async function SupplierInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { proveedor } = await searchParams;

  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <SupplierInvoiceList initialProveedorId={parseSupplierInvoicesProveedor(proveedor) ?? 0} />
    </div>
  );
}
