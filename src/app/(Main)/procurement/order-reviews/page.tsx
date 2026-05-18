import { PurchaseOrderReviewList } from "@/src/features/purchase-order-reviews/components/PurchaseOrderReviewList";

// Página de revisión de pedidos de compra — flujo completo de recepción y cierre
export default function OrderReviewsPage() {
  return (
    <div className="px-1 pb-8">
      {/* Encabezado de la sección */}
      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
          Revisión de Pedidos
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Seguimiento del flujo de compras: desde la solicitud hasta la confirmación de recepción y cierre con CxP
        </p>
      </div>
      <PurchaseOrderReviewList />
    </div>
  );
}
