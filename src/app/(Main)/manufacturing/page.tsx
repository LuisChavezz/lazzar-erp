import type { Metadata } from "next";
import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";

export const metadata: Metadata = {
  title: "Producción | ERP",
  description:
    "Accesos a las pantallas de Producción: órdenes, existencias, catálogo e indicadores.",
};

// Página principal de Producción — índice de sus sub-grupos, igual que Mesa de
// Control. El resumen operativo vive en `/manufacturing/dashboard`.
export default function ManufacturingPage() {
  return (
    <div className="w-full space-y-8">
      <ModuleSectionsGrid moduleKey="manufacturing" />
    </div>
  );
}
