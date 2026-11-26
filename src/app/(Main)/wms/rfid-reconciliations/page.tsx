import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { RfidReconciliationList } from "@/src/features/rfid-reconciliations/components/RfidReconciliationList";

export default function RfidReconciliationsPage() {
  return (
    <div className="w-full h-[44rem]">
      {/* `RfidReconciliationList` lee filtros, búsqueda, orden y página desde
          la URL con `useSearchParams`, que en Next.js requiere un límite de
          Suspense en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando encuadres..." />}>
        <RfidReconciliationList />
      </Suspense>
    </div>
  );
}
