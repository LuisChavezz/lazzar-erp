import { PurchaseOrderReceiptKpisSection } from "@/src/features/purchase-order-receipts/components/PurchaseOrderReceiptKpisSection";
import { PurchaseOrderReceiptList } from "@/src/features/purchase-order-receipts/components/PurchaseOrderReceiptList";

export default function PurchaseOrderReceiptsPage() {
  return (
    <div className="w-full space-y-6">
      {/* Indicadores con consulta PROPIA: cargan y fallan dentro de su
          sección, así que la tabla y su toolbar no dependen de ellos. */}
      <PurchaseOrderReceiptKpisSection />
      <PurchaseOrderReceiptList />
    </div>
  );
}
