import { Metadata } from 'next';
import { OrderListView } from '@/src/features/orders/components/OrderListView';
import { PedidoKpisSection } from '@/src/features/orders/components/PedidoKpisSection';
import { PEDIDO_KPIS_QUERY_KEY } from '@/src/features/orders/constants/pedidoKpis';

export const metadata: Metadata = {
  title: 'Mis Pedidos | CRM y Ventas | ERP',
  description:
    'Pedidos originados en las cotizaciones que creaste, con acceso a su detalle.',
};

// Las llaves que el refresco de la tabla invalida además de la lista.
const EXTRA_REFETCH_QUERY_KEYS = [PEDIDO_KPIS_QUERY_KEY];

export default function SalesOrdersPage() {
  return (
    <main className="w-full space-y-6" aria-label="Mis pedidos">
      {/* Indicadores con consulta PROPIA: cargan y fallan dentro de su
          sección, así que la lista y su toolbar no dependen de ellos. */}
      <PedidoKpisSection />
      <section aria-label="Lista de pedidos">
        <OrderListView
          from="sales"
          params={{ mis_pedidos: 'true' }}
          variant="sales"
          extraRefetchQueryKeys={EXTRA_REFETCH_QUERY_KEYS}
        />
      </section>
    </main>
  );
}
