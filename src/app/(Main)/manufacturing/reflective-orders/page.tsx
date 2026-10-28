import type { Metadata } from "next";
import { ReflectiveOrdersView } from "@/src/features/reflective-orders/components/ReflectiveOrdersView";

export const metadata: Metadata = {
  title: "Órdenes de Reflejante | Producción | ERP",
};

// Página de Órdenes de Reflejante — módulo de manufactura
export default function ReflectiveOrdersPage() {
  return <ReflectiveOrdersView />;
}
