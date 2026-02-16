import { ReceiptStats } from "@/src/features/receipt/components/ReceiptStats";
import { ReceiptsList } from "@/src/features/receipt/components/ReceiptList";




export default function ReceiptsPage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestión de recepciones de mercancía y entradas a almacén.
        </p>
      </div>

      {/* Stats */}
      <ReceiptStats />

      {/* Content */}
      <div className="space-y-6">
        <ReceiptsList />
      </div>
    </div>
  );
}
