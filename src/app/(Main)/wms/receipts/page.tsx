
import { ReceiptView } from "@/src/features/receipts/components/ReceiptView";

export default function Receipts() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Reporte de recepciones de mercancía, con detalles de proveedores, productos y estado de cada recepción.
        </p>
      </div>

      <ReceiptView />
    </div>
  );
}
