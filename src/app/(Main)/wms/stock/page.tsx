import { StockView } from "@/src/features/stock/components/StockView";

export default function StockPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestión centralizada de stock y materias primas.
        </p>
      </div>

      <StockView />
    </div>
  );
}
