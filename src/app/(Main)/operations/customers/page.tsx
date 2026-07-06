import { Metadata } from "next";
import { OperationsCustomerList } from "@/src/features/operations-customers/components/OperationsCustomerList";

export const metadata: Metadata = {
  title: "Clientes | Mesa de Control | ERP",
  description:
    "Consulta el catálogo completo de clientes, incluidos inactivos, desde la Mesa de Control.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Mesa de Control de Clientes",
  description:
    "Consulta el catálogo completo de clientes, incluidos inactivos, desde la Mesa de Control.",
  applicationCategory: "BusinessApplication",
};

export default function OperationsCustomersPage() {
  return (
    <main className="w-full space-y-8" aria-label="Mesa de Control de Clientes">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header>
        <h1 className="sr-only">Clientes - Mesa de Control</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Consulta todos los clientes registrados, incluidos los inactivos, desde la Mesa de Control.
        </p>
      </header>
      <section aria-label="Vista de Clientes" className="space-y-6">
        <OperationsCustomerList />
      </section>
    </main>
  );
}
