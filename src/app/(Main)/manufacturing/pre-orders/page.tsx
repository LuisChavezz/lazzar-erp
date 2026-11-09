import type { Metadata } from "next";
import { PreOrdersView } from "@/src/features/pre-orders/components/PreOrdersView";

export const metadata: Metadata = {
  title: "Pre-órdenes | Producción | ERP",
};

// Bandeja de pre-órdenes: almacén valida, compras surte, producción crea la OP.
export default function PreOrdersPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <PreOrdersView />
    </div>
  );
}
