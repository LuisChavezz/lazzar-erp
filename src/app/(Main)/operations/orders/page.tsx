import { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader } from '@/src/components/Loader';
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
    <main className="w-full" aria-label="Mesa de Control de Pedidos">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="sr-only">Pedidos - Mesa de Control</h1>
      <section aria-label="Panel de pedidos">
        {/* El panel lee filtros, búsqueda, orden y página desde la URL con
            `useSearchParams`, que en Next.js requiere un límite de Suspense. */}
        <Suspense fallback={<Loader className="py-20" title="Cargando pedidos..." />}>
          <OperationsOrderPanel />
        </Suspense>
      </section>
    </main>
  );
}
