import type { Metadata } from "next";
import { CorteMangaOrdersView } from "@/src/features/corte-manga/components/CorteMangaOrdersView";

export const metadata: Metadata = {
  title: "Órdenes de Corte de Manga | Producción | ERP",
};

// Página de Órdenes de Corte de Manga — módulo de manufactura
export default function CorteMangaOrdersPage() {
  return <CorteMangaOrdersView />;
}
