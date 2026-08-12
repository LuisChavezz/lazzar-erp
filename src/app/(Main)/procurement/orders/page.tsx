import { Metadata } from 'next';
import { OrderListView } from '@/src/features/orders/components/OrderListView';

export const metadata: Metadata = {
  title: 'Pedidos | Compras y SCM | ERP',
  description:
    'Consulta los pedidos de venta y su detalle para planear el abastecimiento.',
};

export default function ProcurementOrdersPage() {
  return (
    <main className="w-full space-y-8" aria-label="Pedidos de compras">
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Consulta los pedidos y su detalle para planear el abastecimiento.
        </p>
      </header>
      <section aria-label="Lista de pedidos">
        <OrderListView from="procurement" />
      </section>
    </main>
  );
}
