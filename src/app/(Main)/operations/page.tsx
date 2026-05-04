import { Metadata } from "next";
import { OperationsKpiGrid } from "@/src/features/operations/components/OperationsKpiGrid";
import { PendingApprovalQueue } from "@/src/features/operations/components/PendingApprovalQueue";
import { QuotesStatusBreakdown } from "@/src/features/operations/components/QuotesStatusBreakdown";
import { RecentActivityFeed } from "@/src/features/operations/components/RecentActivityFeed";
import { OperationsQuickActions } from "@/src/features/operations/components/OperationsQuickActions";

export const metadata: Metadata = {
  title: "Mesa de Control | ERP",
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

export default function OperationsPage() {
  return (
    <main className="w-full space-y-6" aria-label="Mesa de Control">
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cola de autorización (prioridad máxima) */}
        <div className="xl:col-span-2">
          <PendingApprovalQueue />
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          <OperationsQuickActions />
          <QuotesStatusBreakdown />
        </div>
      </div>

      {/* Feed de actividad reciente */}
      <section aria-label="Actividad reciente">
        <RecentActivityFeed />
      </section>
    </main>
  );
}

