import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { CustomerKpisSection } from "@/src/features/customers/components/CustomerKpisSection";
import { CustomerList } from "@/src/features/customers/components/CustomerList";

export default function CustomersPage() {
  return (
    <div className="w-full space-y-6">
      {/* Indicadores con consulta PROPIA: cargan y fallan dentro de su
          sección, así que la lista y su toolbar no dependen de ellos. */}
      <CustomerKpisSection />

      {/* `CustomerList` lee búsqueda, orden y página desde la URL con
          `useSearchParams`, que en Next.js requiere un límite de Suspense en
          el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando clientes..." />}>
        <CustomerList />
      </Suspense>
    </div>
  );
}
