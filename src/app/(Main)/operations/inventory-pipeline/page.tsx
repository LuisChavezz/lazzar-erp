import { Metadata } from "next";
import { InventoryPipelineView } from "@/src/features/inventory-pipeline/components/InventoryPipelineView";

export const metadata: Metadata = {
  title: "Existencias, producción y compras | Mesa de Control | ERP",
  description:
    "Consulta por producto la existencia disponible, la cantidad en órdenes de producción abiertas y las compras pendientes.",
};

export default function InventoryPipelinePage() {
  return (
    <main className="w-full">
      <h1 className="sr-only">Existencias, producción y compras - Mesa de Control</h1>
      <section aria-label="Reporte de existencias, producción y compras">
        <InventoryPipelineView />
      </section>
    </main>
  );
}
