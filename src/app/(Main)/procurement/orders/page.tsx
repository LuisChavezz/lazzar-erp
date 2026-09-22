import { Metadata } from 'next';
import { OrderListView } from '@/src/features/orders/components/OrderListView';

export const metadata: Metadata = {
  title: 'Pedidos | Compras y SCM | ERP',
  description:
    'Consulta los pedidos de venta y su detalle para planear el abastecimiento.',
};

export default function ProcurementOrdersPage() {
  return (
    <main
      className="w-full h-[calc(100dvh-13rem)] min-h-0 flex flex-col"
      aria-label="Pedidos de compras"
    >
      <section aria-label="Lista de pedidos" className="flex-1 min-h-0 flex flex-col">
        <OrderListView from="procurement" variant="procurement" />
      </section>
    </main>
  );
}
