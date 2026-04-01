import { Metadata } from "next";
import { QuoteList } from "@/src/features/quotes/components/QuoteList";
import { QuoteStats } from "@/src/features/quotes/components/QuoteStats";
import { QuoteActions } from "@/src/features/quotes/components/QuoteActions";

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
        <p className="text-slate-500 dark:text-slate-400 mt-1" aria-hidden="false">
          Gestiona y monitorea todas las cotizaciones de venta.
        </p>
      </header>

      {/* Stats */}
      <section aria-label="Estadísticas de Cotizaciones">
        <QuoteStats />
      </section>

      {/* Actions Row */}
      <section aria-label="Acciones de Cotizaciones" className="w-full">
        <QuoteActions />
      </section>

      {/* List */}
      <section aria-label="Lista de Cotizaciones" className="space-y-6">
        <QuoteList />
      </section>
    </main>
  );
}
