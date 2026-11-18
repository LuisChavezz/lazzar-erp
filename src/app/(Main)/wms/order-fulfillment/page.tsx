import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@/src/components/Loader";
import { SurtidoPedidosList } from "@/src/features/order-fulfillment/components/SurtidoPedidosList";

export const metadata: Metadata = {
  title: "Avance de surtido | Operaciones de Almacén | ERP",
  description:
    "Cuánto lleva surtido cada pedido y cuánto tiene todavía comprometido, con su avance por talla.",
};

export default function OrderFulfillmentPage() {
  return (
    <div className="w-full">
      {/* `SurtidoPedidosList` lee filtros, búsqueda y página de la URL con
          `useSearchParams`, que en Next.js requiere un límite de Suspense. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando avance de surtido..." />}>
        <SurtidoPedidosList />
      </Suspense>
    </div>
  );
}
