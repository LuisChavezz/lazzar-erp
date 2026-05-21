import { Metadata } from "next";
import { OperationsQuoteList } from "@/src/features/operations/components/OperationsQuoteList";

export const metadata: Metadata = {
  title: "Cotizaciones | Mesa de Control | ERP",
  description: "Supervisa y administra las cotizaciones desde la Mesa de Control para dar seguimiento operativo en tiempo real.",
};

const jsonLd = { // JSON-LD para SEO
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Mesa de Control de Cotizaciones",
  description: "Supervisa y administra las cotizaciones desde la Mesa de Control para dar seguimiento operativo en tiempo real.",
  applicationCategory: "BusinessApplication",
};

export default function OperationsOrdersPage() {
  return (
    <main className="w-full space-y-8" aria-label="Mesa de Control de Cotizaciones">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header>
        <h1 className="sr-only">Cotizaciones - Mesa de Control</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1" aria-hidden="false">
          Supervisa y administra todas las cotizaciones desde la Mesa de Control.
        </p>
      </header>
      <section aria-label="Vista de Cotizaciones" className="space-y-6">
        <OperationsQuoteList />
      </section>
    </main>
  );
}
