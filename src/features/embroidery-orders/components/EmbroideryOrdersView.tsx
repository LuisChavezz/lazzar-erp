import { OrderMetrics } from "@/src/features/orders-menu/components/OrderMetrics";
import { buildOrderMetrics } from "@/src/features/orders-menu/utils/order-metrics.util";
import { EMBROIDERY_ORDERS_DATA } from "@/src/features/orders-menu/constants/orderSampleData";
import EmbroideryOrderList from "./EmbroideryOrderList";

export default function EmbroideryOrdersView() {
  const metrics = buildOrderMetrics(EMBROIDERY_ORDERS_DATA);

  return (
    <div className="flex flex-col gap-6">
      <OrderMetrics metrics={metrics} />
      <EmbroideryOrderList />
    </div>
  );
}
