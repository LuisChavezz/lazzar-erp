import { Metadata } from "next";
import { OperationsKpiGrid } from "@/src/features/operations/components/OperationsKpiGrid";
import { PendingApprovalQueue } from "@/src/features/operations/components/PendingApprovalQueue";
import { OperationsQuotesStatusBreakdown } from "@/src/features/operations/components/OperationsQuotesStatusBreakdown";
import { RecentActivityFeed } from "@/src/features/operations/components/RecentActivityFeed";

export const metadata: Metadata = {
  title: "Panel | Mesa de Control | ERP",
  description:
    "Visualiza indicadores clave operativos para dar seguimiento de pedidos en tiempo real.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Mesa de Control Operativa",
  description:
    "Visualiza indicadores clave operativos para dar seguimiento de pedidos en tiempo real.",
  applicationCategory: "BusinessApplication",
};

export default function OperationsDashboardPage() {
  return (
    <main className="w-full space-y-6" aria-label="Panel de Mesa de Control">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Encabezado */}
      {/* <header>
        
      </header> */}

      {/* KPIs principales */}
      <section aria-label="Indicadores clave operativos">
        <OperationsKpiGrid />
      </section>

      {/* Fila principal — cola + panel lateral */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Cola de autorización (prioridad máxima) */}
        {/* y, debajo, la actividad reciente: así la columna ancha no deja un
            hueco junto al panel lateral. */}
        <div className="xl:col-span-2 space-y-6">
          <PendingApprovalQueue />
          <section aria-label="Actividad reciente">
            <RecentActivityFeed />
          </section>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          <OperationsQuotesStatusBreakdown />
        </div>
      </div>
    </main>
  );
}

