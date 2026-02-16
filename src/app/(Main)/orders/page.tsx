import { OrdersStats } from "@/src/features/orders/components/OrdersStats";
import { OrdersList } from "@/src/features/dashboard/components/OrdersList";

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
      <OrdersStats />

      {/* Content */}
      <div className="space-y-6">
        <OrdersList />
      </div>
    </div>
  );
}
