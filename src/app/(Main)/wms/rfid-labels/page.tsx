import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { RfidLabelsView } from "@/src/features/rfid-labels/components/RfidLabelsView";

// Página de Etiquetas RFID — módulo de WMS
export default function RfidLabelsPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      {/* `RfidLabelsView` lee búsqueda, filtro, orden y página desde la URL con
          `useSearchParams`, que en Next.js requiere un límite de Suspense. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando impresiones..." />}>
        <RfidLabelsView />
      </Suspense>
    </div>
  );
}
