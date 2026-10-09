import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import PayrollList from "@/src/features/payroll/components/PayrollList";

/**
 * Nóminas de RH. Sin regla propia de permisos: la cubre el catch-all
 * `/hr` → `R-RH` de `routePermissions`.
 */
export default function HrPayrollPage() {
  return (
    <div className="w-full">
      {/* `PayrollList` lee la quincena desde la URL con `useSearchParams`, que
          en Next.js requiere un límite de Suspense en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando nóminas..." />}>
        <PayrollList />
      </Suspense>
    </div>
  );
}
