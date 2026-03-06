import { OrderMetrics } from "@/src/features/orders-menu/components/OrderMetrics";
import { buildOrderMetrics } from "@/src/features/orders-menu/utils/order-metrics.util";
import { PRODUCTION_ORDERS_DATA } from "@/src/features/orders-menu/constants/orderSampleData";
import ProductionOrderList from "./ProductionOrderList";

export default function ProductionOrdersView() {
  const metrics = buildOrderMetrics(PRODUCTION_ORDERS_DATA);

  return (
    <div className="flex flex-col gap-6">
      <OrderMetrics metrics={metrics} />
      <ProductionOrderList />
    </div>
  );
}
