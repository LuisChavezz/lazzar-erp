import { Metadata } from "next";
import { QuoteStats } from "@/src/features/quotes/components/QuoteStats";
import { QuoteActions } from "@/src/features/quotes/components/QuoteActions";
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
    <main className="w-full space-y-6 md:space-y-8" aria-label="Gestión de Cotizaciones">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <header>
        <h1 className="sr-only">Cotizaciones de Venta</h1>
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          Gestiona y monitorea todas las cotizaciones de venta.
        </p>
      </header>

      {/* Stats */}
      <section aria-labelledby="quotes-stats-heading">
        <h2 id="quotes-stats-heading" className="sr-only">Estadísticas de cotizaciones</h2>
        <QuoteStats />
      </section>

      {/* Actions Row */}
      <section aria-labelledby="quotes-actions-heading" className="w-full">
        <h2 id="quotes-actions-heading" className="sr-only">Acciones de cotizaciones</h2>
        <QuoteActions />
      </section>

      {/* Listado / Tablero Kanban — con selector de vista */}
      <section aria-labelledby="quotes-view-heading" className="space-y-4">
        <h2 id="quotes-view-heading" className="sr-only">Cotizaciones</h2>
        <QuoteViewSwitcher />
      </section>

    </main>
  );
}
