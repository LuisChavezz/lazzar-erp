import { InvoiceStats } from "@/src/features/invoicing/components/InvoiceStats";
import { InvoiceList } from "@/src/features/invoicing/components/InvoiceList";

export default function InvoicePage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0 flex flex-col space-y-6">
      <div className="shrink-0">
        <InvoiceStats />
      </div>

      <div className="flex-1 min-h-120 flex flex-col">
        <InvoiceList />
      </div>
    </div>
  );
}
