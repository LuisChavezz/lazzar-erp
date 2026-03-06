import { OrderMetrics } from "@/src/features/orders-menu/components/OrderMetrics";
import { buildOrderMetrics } from "@/src/features/orders-menu/utils/order-metrics.util";
import { PURCHASE_ORDERS_DATA } from "@/src/features/orders-menu/constants/orderSampleData";
import PurchaseOrderList from "./PurchaseOrderList";

export default function PurchaseOrdersView() {
  const metrics = buildOrderMetrics(PURCHASE_ORDERS_DATA);

  return (
    <div className="flex flex-col gap-6">
      <OrderMetrics metrics={metrics} />
      <PurchaseOrderList />
    </div>
  );
}
