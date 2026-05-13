import { StockMockView } from "@/src/features/stock/components/StockMockView";

export default function StockPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Reporte consolidado de existencias, reservas y movimientos en almacén.
        </p>
      </div>

      <StockMockView />
    </div>
  );
}
