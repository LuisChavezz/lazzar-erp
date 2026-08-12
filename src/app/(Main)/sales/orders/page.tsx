import { Metadata } from 'next';
import { SalesOrderList } from '@/src/features/orders/components/SalesOrderList';

export const metadata: Metadata = {
  title: 'Mis Pedidos | CRM y Ventas | ERP',
  description:
    'Pedidos originados en las cotizaciones que creaste, con acceso a su detalle.',
};

export default function SalesOrdersPage() {
  return (
    <main className="w-full space-y-8" aria-label="Mis pedidos">
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pedidos originados en las cotizaciones que creaste. Consulta su detalle y
          estado de confirmación.
        </p>
      </header>
      <section aria-label="Lista de pedidos">
        <SalesOrderList />
      </section>
    </main>
  );
}
