import type { Metadata } from "next";
import { SpecialOrdersView } from "@/src/features/special-orders/components/SpecialOrdersView";

export const metadata: Metadata = {
  title: "Pedidos Especiales | Producción | ERP",
};

// Página de Pedidos especiales — módulo de manufactura
export default function SpecialOrdersPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <SpecialOrdersView />
    </div>
  );
}
