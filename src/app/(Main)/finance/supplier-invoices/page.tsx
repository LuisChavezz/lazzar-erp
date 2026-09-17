import SupplierInvoiceList from "@/src/features/supplier-invoices/components/SupplierInvoiceList";

/**
 * Facturas de proveedor (EC-142). Sin regla propia de permisos: la cubre el
 * catch-all `/finance` → `R-CONTABILIDAD`.
 */
export default function SupplierInvoicesPage() {
  return (
    <div className="w-full">
      <SupplierInvoiceList />
    </div>
  );
}
