import { Metadata } from "next";
import { OrderList } from "@/src/features/orders/components/OrderList";
// import { OrderActions } from "@/src/features/orders/components/OrderActions";

export const metadata: Metadata = {
  title: "Pedidos | Mesa de Control | ERP",
  description: "Supervisa y administra los pedidos desde la Mesa de Control para dar seguimiento operativo en tiempo real.",
};

const jsonLd = { // JSON-LD para SEO
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Mesa de Control de Pedidos",
  description: "Supervisa y administra los pedidos desde la Mesa de Control para dar seguimiento operativo en tiempo real.",
  applicationCategory: "BusinessApplication",
};

export default function OperationsOrdersPage() {
  return (
    <main className="w-full space-y-8" aria-label="Mesa de Control de Pedidos">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header>
        <h1 className="sr-only">Pedidos - Mesa de Control</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1" aria-hidden="false">
          Supervisa y administra todos los pedidos desde la Mesa de Control.
        </p>
      </header>
      {/* <section aria-label="Acciones de Pedidos">
        <OrderActions />
      </section> */}
      <section aria-label="Lista de Pedidos" className="space-y-6">
        <OrderList />
      </section>
    </main>
  );
}
