import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { SupplierKpisSection } from "@/src/features/suppliers/components/SupplierKpisSection";
import SupplierView from "@/src/features/suppliers/components/SupplierView";

export default function ProcurementSuppliersPage() {
  return (
    <div className="w-full space-y-6">
      {/* Indicadores con consulta PROPIA: cargan y fallan dentro de su
          sección, así que la tabla y su toolbar no dependen de ellos. */}
      <SupplierKpisSection />
      {/* `SupplierView` lee búsqueda, orden y página desde la URL con
          `useSearchParams`, que en Next.js requiere un límite de Suspense en
          el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando proveedores..." />}>
        <SupplierView />
      </Suspense>
    </div>
  );
}
