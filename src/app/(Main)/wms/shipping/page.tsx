import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { ShippingView } from "@/src/features/shipping/components/ShippingView";

export default function ShippingPage() {
  return (
    <div className="w-full h-[44rem]">
      {/* `ShippingView` lee el filtro de estado de la URL con `useSearchParams`,
          que en Next.js requiere un límite de Suspense en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando envíos..." />}>
        <ShippingView />
      </Suspense>
    </div>
  );
}
