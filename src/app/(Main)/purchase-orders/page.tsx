import { OrderList } from "@/src/features/orders/components/OrderList";
import { OrderStats } from "@/src/features/orders/components/OrderStats";

export default function OrdersPage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestiona y monitorea todas las órdenes de venta.
        </p>
      </div>

      {/* Stats */}
      <OrderStats />

      {/* Content */}
      <div className="space-y-6">
        <OrderList />
      </div>
    </div>
  );
}
