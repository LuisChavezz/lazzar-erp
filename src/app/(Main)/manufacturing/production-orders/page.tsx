import { ProductionOrderList } from "@/src/features/production-orders/components/ProductionOrderList";

// Página de Órdenes de Producción — módulo de manufactura
export default function ProductionOrdersPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <ProductionOrderList />
    </div>
  );
}
