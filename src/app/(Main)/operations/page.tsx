import { Metadata } from "next";
import { QuoteStats } from "@/src/features/operations/components/QuoteStats";

export const metadata: Metadata = {
  title: "Mesa de Control | ERP",
  description: "Visualiza indicadores clave operativos para dar seguimiento de pedidos en tiempo real.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Mesa de Control Operativa",
  description: "Visualiza indicadores clave operativos para dar seguimiento de pedidos en tiempo real.",
  applicationCategory: "BusinessApplication",
};

export default function OperationsPage() {
  return (
    <main className="w-full space-y-8" aria-label="Mesa de Control">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header>
        <h1 className="text-slate-900 dark:text-slate-100 text-xl font-semibold">Mesa de Control</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitorea indicadores operativos clave para actuar rápidamente sobre los pedidos.
        </p>
      </header>
      <section aria-label="Indicadores operativos de pedidos">
        <QuoteStats />
      </section>
    </main>
  );
}
