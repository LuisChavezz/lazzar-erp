import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { SalidasMaquilaView } from "@/src/features/maquila-outputs/components/SalidasMaquilaView";

export const metadata: Metadata = {
  title: "Salidas a Maquila | Producción | ERP",
};

/** `Suspense` porque los filtros de OP y maquilero viven en la URL (`useSearchParams`). */
export default function SalidasMaquilaPage() {
  return (
    <Suspense fallback={<Loader className="py-20" title="Cargando salidas a maquila..." />}>
      <SalidasMaquilaView />
    </Suspense>
  );
}
