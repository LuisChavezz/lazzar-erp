import { Metadata } from 'next';
import { WmsOrderList } from '@/src/features/orders/components/WmsOrderList';

export const metadata: Metadata = {
  title: 'Pedidos | Operaciones de Almacén | ERP',
  description:
    'Consulta los pedidos autorizados y su detalle para planear el surtido en almacén.',
};

export default function WmsOrdersPage() {
  return (
    <main className="w-full space-y-8" aria-label="Pedidos de almacén">
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Consulta los pedidos y su detalle para planear el surtido en almacén.
        </p>
      </header>
      <section aria-label="Lista de pedidos">
        <WmsOrderList />
      </section>
    </main>
  );
}
