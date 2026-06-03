
import { ReceiptStepManager } from "@/src/features/receipts/components/ReceiptStepManager";

export default function Receipts() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Recepción de Mercancía
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Reporte de recepciones de mercancía, con detalles de proveedores, productos y estado de cada recepción.
        </p>
      </div>

      {/* Onboarding flow */}
      <ReceiptStepManager />
    </div>
  );
}
