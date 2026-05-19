import { ExpensePurchaseRequestList } from "@/src/features/expense-purchase-requests/components/ExpensePurchaseRequestList";

// Página de solicitudes de compras de gastos — flujo desde el requerimiento hasta el cierre con CxP
export default function ExpenseRequestsPage() {
  return (
    <div className="px-1 pb-8">
      {/* Encabezado de la sección */}
      <div className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestión de solicitudes de gasto: desde el requerimiento y contacto con el proveedor hasta la integración de documentos y cierre con Cobranza
        </p>
      </div>
      <ExpensePurchaseRequestList />
    </div>
  );
}
