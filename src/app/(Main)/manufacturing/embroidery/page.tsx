import type { Metadata } from "next";
import { EmbroideryView } from "@/src/features/embroidery/components/EmbroideryView";

export const metadata: Metadata = {
  title: "Órdenes de Bordado | Producción | ERP",
};

// Página de Órdenes de Bordado — módulo de manufactura
export default function EmbroideryPage() {
  return <EmbroideryView />;
}
