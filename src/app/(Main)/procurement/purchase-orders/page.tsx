import { PurchaseOrderStats } from "@/src/features/purchase-orders/components/PurchaseOrderStats";
import { PurchaseOrderList } from "@/src/features/purchase-orders/components/PurchaseOrderList";

export default function PurchaseOrdersPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestión y seguimiento de órdenes de compra.
        </p>
      </div>

      <PurchaseOrderStats />

      <div className="space-y-6">
        <PurchaseOrderList />
      </div>
    </div>
  );
}
