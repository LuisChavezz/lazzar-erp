import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { BankReconciliationView } from "@/src/features/bank-reconciliations/components/BankReconciliationView";

/**
 * Conciliaciones bancarias. Sin regla propia de permisos: la cubre el catch-all
 * `/finance` → `R-CONTABILIDAD`.
 */
export default function BankReconciliationsPage() {
  return (
    <div className="w-full">
      {/* `BankReconciliationView` lee la cuenta y el periodo desde la URL con
          `useSearchParams`, que en Next.js requiere un límite de Suspense en el
          árbol superior. */}
      <Suspense
        fallback={
          <Loader className="py-20" title="Cargando conciliaciones bancarias..." />
        }
      >
        <BankReconciliationView />
      </Suspense>
    </div>
  );
}
