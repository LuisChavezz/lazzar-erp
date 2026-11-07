import type { Metadata } from "next";
import { ManufacturingDashboard } from "@/src/features/manufacturing/components/ManufacturingDashboard";

export const metadata: Metadata = {
  title: "Dashboard | Producción | ERP",
  description: "Resumen operativo de los procesos de producción y bordado.",
};

// Sin `<h1>` propio: el encabezado global ya titula la página.
export default function ManufacturingDashboardPage() {
  return (
    <div className="px-1 pb-8">
      <ManufacturingDashboard />
    </div>
  );
}
