import { Metadata } from 'next';
import { OperationsOrderPanel } from '@/src/features/operations/components/OperationsOrderPanel';

export const metadata: Metadata = {
  title: 'Pedidos | Mesa de Control | ERP',
  description:
    'Gestiona el flujo de pedidos: revisa inventario, clasifica stock y programa órdenes de producción.',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Mesa de Control de Pedidos',
  description:
    'Gestiona el flujo de pedidos: revisa inventario, clasifica stock y programa órdenes de producción.',
  applicationCategory: 'BusinessApplication',
};

export default function OperationsOrdersPage() {
  return (
    <main className="w-full space-y-8" aria-label="Mesa de Control de Pedidos">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Revisa inventario, clasifica stock y programa producción para cada pedido autorizado.
        </p>
      </header>
      <section aria-label="Panel de pedidos">
        <OperationsOrderPanel />
      </section>
    </main>
  );
}
