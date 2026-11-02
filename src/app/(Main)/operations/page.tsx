import { Metadata } from "next";
import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";

export const metadata: Metadata = {
  title: "Mesa de Control | ERP",
  description:
    "Accesos a las pantallas de Mesa de Control: cotizaciones, pedidos, seguimiento, clientes, comunicación e indicadores.",
};

// Página principal de Mesa de Control — índice de sus sub-grupos.
export default function OperationsPage() {
  return (
    <div className="w-full space-y-8">
      <ModuleSectionsGrid moduleKey="operations" />
    </div>
  );
}
