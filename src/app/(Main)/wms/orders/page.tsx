import { Suspense } from 'react';
import { Metadata } from 'next';
import { WmsOrderListView } from '@/src/features/orders/components/WmsOrderListView';

export const metadata: Metadata = {
  title: 'Pedidos | Operaciones de Almacén | ERP',
  description:
    'Consulta los pedidos programados por Mesa de Control y su detalle para planear el surtido en almacén.',
};

export default function WmsOrdersPage() {
  return (
    <main
      className="w-full h-[44rem] flex flex-col"
      aria-label="Pedidos de almacén"
    >
      <section aria-label="Lista de pedidos" className="flex-1 min-h-0 flex flex-col">
        {/* `<Suspense>`: la pestaña (`?tab=`) y las tablas en modo servidor leen
            su estado de la URL (`useSearchParams`). */}
        <Suspense>
          <WmsOrderListView />
        </Suspense>
      </section>
    </main>
  );
}
