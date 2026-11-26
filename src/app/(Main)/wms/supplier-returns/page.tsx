import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { SupplierReturnList } from "@/src/features/supplier-returns/components/SupplierReturnList";

export default function SupplierReturnsPage() {
  return (
    <div className="w-full h-[44rem]">
      {/* `SupplierReturnList` lee filtros, búsqueda, orden y página desde la
          URL con `useSearchParams`, que en Next.js requiere un límite de
          Suspense en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando devoluciones..." />}>
        <SupplierReturnList />
      </Suspense>
    </div>
  );
}
