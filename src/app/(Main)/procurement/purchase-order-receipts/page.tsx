import { PurchaseOrderReceiptList } from "@/src/features/purchase-order-receipts/components/PurchaseOrderReceiptList";

export default function PurchaseOrderReceiptsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Recepciones generadas a partir de órdenes de compra.
        </p>
      </div>

      <div className="space-y-6">
        <PurchaseOrderReceiptList />
      </div>
    </div>
  );
}
