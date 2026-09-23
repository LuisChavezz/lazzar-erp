import { Metadata } from 'next';
import { OrderListView } from '@/src/features/orders/components/OrderListView';

export const metadata: Metadata = {
  title: 'Pedidos | Operaciones de Almacén | ERP',
  description:
    'Consulta los pedidos y su detalle para planear el surtido en almacén.',
};

export default function WmsOrdersPage() {
  return (
    <main
      className="w-full h-[calc(100dvh-13rem)] min-h-0 flex flex-col"
      aria-label="Pedidos de almacén"
    >
      <section aria-label="Lista de pedidos" className="flex-1 min-h-0 flex flex-col">
        <OrderListView from="wms" fillHeight />
      </section>
    </main>
  );
}
