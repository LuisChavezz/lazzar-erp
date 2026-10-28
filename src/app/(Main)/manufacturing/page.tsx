import type { Metadata } from "next";
import { ManufacturingDashboard } from "@/src/features/manufacturing/components/ManufacturingDashboard";

export const metadata: Metadata = {
  title: "Producción | ERP",
  description: "Resumen operativo de los procesos de producción y bordado.",
};

// Página principal del módulo de manufactura — Dashboard resumen operativo.
// Sin `<h1>` propio: el encabezado global ya titula la página, y repetirlo
// empujaba el contenido hacia abajo.
export default function ManufacturingPage() {
  return (
    <div className="px-1 pb-8">
      <ManufacturingDashboard />
    </div>
  );
}
