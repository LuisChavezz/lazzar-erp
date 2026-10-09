import { PurchaseOrderKpisSection } from "@/src/features/purchase-orders/components/PurchaseOrderKpisSection";
import { PurchaseOrderView } from "@/src/features/purchase-orders/components/PurchaseOrderView";

export default function PurchaseOrdersPage() {
  return (
    <div className="w-full space-y-6">
      {/* Indicadores con consulta PROPIA: cargan y fallan dentro de su
          sección, así que la tabla y su toolbar no dependen de ellos. */}
      <PurchaseOrderKpisSection />
      <PurchaseOrderView />
    </div>
  );
}
