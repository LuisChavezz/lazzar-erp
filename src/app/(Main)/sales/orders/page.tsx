import { Metadata } from "next";
import { OrderList } from "@/src/features/orders/components/OrderList";
import { OrderStats } from "@/src/features/orders/components/OrderStats";
import { OrderActions } from "@/src/features/orders/components/OrderActions";

export const metadata: Metadata = {
  title: "Órdenes de Venta | ERP",
  description: "Gestiona, monitorea y administra todas las órdenes de venta de manera eficiente.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Sistema de Gestión de Órdenes de Venta",
  description: "Gestiona, monitorea y administra todas las órdenes de venta de manera eficiente.",
  applicationCategory: "BusinessApplication",
};

export default function OrdersPage() {
  return (
    <main className="w-full space-y-8" aria-label="Gestión de Órdenes de Venta">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <header>
        <h1 className="sr-only">Órdenes de Venta</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1" aria-hidden="false">
          Gestiona y monitorea todas las órdenes de venta.
        </p>
      </header>

      {/* Stats */}
      <section aria-label="Estadísticas de Órdenes">
        <OrderStats />
      </section>

      {/* Actions Row */}
      <section aria-label="Acciones de Órdenes">
        <OrderActions />
      </section>

      {/* List */}
      <section aria-label="Lista de Órdenes" className="space-y-6">
        <OrderList />
      </section>
    </main>
  );
}
