import { PickingView } from "@/src/features/picking/components/PickingView";

export default function PickingPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Surtido de pedidos: recolección de productos en almacén según las
          cantidades y ubicaciones asignadas a cada picking.
        </p>
      </div>

      <PickingView />
    </div>
  );
}
