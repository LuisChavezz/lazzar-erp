import { PurchaseOrderReceiptList } from "@/src/features/purchase-order-receipts/components/PurchaseOrderReceiptList";

export default function PurchaseOrderReceiptsPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <PurchaseOrderReceiptList />
    </div>
  );
}
