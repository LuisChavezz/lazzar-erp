import { PQOrderList } from "@/src/features/pq-orders/components/PQOrderList";

// Página de Pedidos PQ — seguimiento de pedidos de quincena vinculados a órdenes de compra
export default function PQOrdersPage() {
  return (
    <div className="px-1 pb-8">
      {/* Encabezado de la sección */}
      <div className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Seguimiento de pedidos de quincena vinculados a órdenes de compra: desde la generación hasta el surtido exitoso de materiales en almacén.
        </p>
      </div>
      <PQOrderList />
    </div>
  );
}
