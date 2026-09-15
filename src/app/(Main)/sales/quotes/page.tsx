import { Metadata } from "next";
import { QuoteStats } from "@/src/features/quotes/components/QuoteStats";
import { QuoteViewSwitcher } from "@/src/features/quotes/components/QuoteViewSwitcher";

export const metadata: Metadata = {
  title: "Cotizaciones | ERP",
  description: "Gestiona, monitorea y administra todas las cotizaciones de venta de manera eficiente.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Sistema de Gestión de Cotizaciones",
  description: "Gestiona, monitorea y administra todas las cotizaciones de venta de manera eficiente.",
  applicationCategory: "BusinessApplication",
};

export default function QuotesPage() {
  return (
    <main className="w-full space-y-3 md:space-y-4" aria-label="Gestión de Cotizaciones">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="sr-only">Cotizaciones de Venta</h1>

      {/* Stats */}
      <section aria-labelledby="quotes-stats-heading">
        <h2 id="quotes-stats-heading" className="sr-only">Estadísticas de cotizaciones</h2>
        <QuoteStats />
      </section>

      {/* Listado / Tablero Kanban — con selector de vista */}
      <section aria-labelledby="quotes-view-heading">
        <h2 id="quotes-view-heading" className="sr-only">Cotizaciones</h2>
        <QuoteViewSwitcher />
      </section>
    </main>
  );
}
