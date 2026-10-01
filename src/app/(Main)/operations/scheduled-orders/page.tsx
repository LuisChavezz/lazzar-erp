import { Metadata } from 'next';
import { ScheduledOrdersPanel } from '@/src/features/operations/components/ScheduledOrdersPanel';

export const metadata: Metadata = {
  title: 'Pedidos Programados | Mesa de Control | ERP',
  description:
    'Consulta los pedidos que Mesa de Control ya programó, con sus destinos y cantidades.',
};

export default function ScheduledOrdersPage() {
  return (
    <main className="w-full" aria-label="Pedidos Programados">
      <h1 className="sr-only">Pedidos Programados - Mesa de Control</h1>
      <section aria-label="Tabla de Pedidos Programados">
        <ScheduledOrdersPanel />
      </section>
    </main>
  );
}
