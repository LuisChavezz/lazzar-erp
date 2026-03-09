import { InvoiceStats } from "@/src/features/invoicing/components/InvoiceStats";
import { InvoiceList } from "@/src/features/invoicing/components/InvoiceList";

export default function InvoicePage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestión de facturación electrónica, clientes y cobranza.
        </p>
      </div>

      {/* Stats */}
      <InvoiceStats />

      {/* Content */}
      <div className="space-y-6">
        <InvoiceList />
      </div>
    </div>
  );
}
