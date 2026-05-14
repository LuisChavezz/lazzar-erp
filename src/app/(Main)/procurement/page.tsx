import { MOCK_PURCHASE_ORDERS } from "@/src/features/purchase-orders/mocks/purchase-orders.mock";
import { PurchaseOrderDashboard } from "@/src/features/purchase-orders/components/PurchaseOrderDashboard";

export default function ProcurementPage() {
  return (
    <div className="px-1 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
          Compras
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Resumen del ciclo de vida de órdenes de compra e importaciones
        </p>
      </div>
      <PurchaseOrderDashboard orders={MOCK_PURCHASE_ORDERS} />
    </div>
  );
}
