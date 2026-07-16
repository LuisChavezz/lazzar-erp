import { StockTransfersView } from "@/src/features/stock-transfers/components/StockTransfersView";

export default function StockTransfersPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Captura de traspasos de existencias entre almacenes, con detalle por
          producto o variante, ubicaciones y cantidades.
        </p>
      </div>

      <StockTransfersView />
    </div>
  );
}
