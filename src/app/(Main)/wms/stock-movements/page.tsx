import { StockMovementsView } from "@/src/features/stock-movements/components/StockMovementsView";

export default function StockMovementsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Historial de movimientos de inventario en el almacén.
        </p>
      </div>

      <StockMovementsView />
    </div>
  );
}
