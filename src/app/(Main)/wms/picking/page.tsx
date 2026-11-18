import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { PickingView } from "@/src/features/picking/components/PickingView";

export default function PickingPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      {/* `PickingView` lee filtros, búsqueda, orden y página desde la URL con
          `useSearchParams`, que en Next.js requiere un límite de Suspense en
          el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando surtidos..." />}>
        <PickingView />
      </Suspense>
    </div>
  );
}
