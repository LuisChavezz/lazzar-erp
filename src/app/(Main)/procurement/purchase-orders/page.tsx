import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { PurchaseOrderKpisSection } from "@/src/features/purchase-orders/components/PurchaseOrderKpisSection";
import { PurchaseOrderView } from "@/src/features/purchase-orders/components/PurchaseOrderView";

export default function PurchaseOrdersPage() {
  return (
    <div className="w-full space-y-6">
      {/* Indicadores con consulta PROPIA: cargan y fallan dentro de su
          sección, así que la tabla y su toolbar no dependen de ellos. */}
      <PurchaseOrderKpisSection />
      {/* `PurchaseOrderView` lee filtros, búsqueda, orden y página desde la
          URL con `useSearchParams`, que en Next.js requiere un límite de
          Suspense en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando órdenes de compra..." />}>
        <PurchaseOrderView />
      </Suspense>
    </div>
  );
}
