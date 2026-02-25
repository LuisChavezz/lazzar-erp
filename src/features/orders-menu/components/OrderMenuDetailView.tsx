import { ArrowLeftIcon } from "@/src/components/Icons";
import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";

const EmbroideryOrderList = dynamic(
  () => import("@/src/features/embroidery-orders/components/EmbroideryOrderList"),
  { loading: () => <LoadingSkeleton /> }
);
const ProductionOrderList = dynamic(
  () => import("@/src/features/production-orders/components/ProductionOrderList"),
  { loading: () => <LoadingSkeleton /> }
);
const PurchaseOrderList = dynamic(
  () => import("@/src/features/purchase-orders/components/PurchaseOrderList"),
  { loading: () => <LoadingSkeleton /> }
);

interface OrderMenuDetailViewProps {
  selectedView: string | null;
  onBack: () => void;
}

export function OrderMenuDetailView({ selectedView, onBack }: OrderMenuDetailViewProps) {
  const renderBackButton = () => (
    <div className="sticky top-0 z-10 py-2 w-fit">
      <button
        onClick={onBack}
        className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Volver a órdenes</span>
      </button>
    </div>
  );

  return (
    <div
      className={`
        col-start-1 row-start-1 w-full transition-all duration-500 ease-in-out
        ${!selectedView
          ? "opacity-0 translate-y-20 pointer-events-none scale-95"
          : "opacity-100 translate-y-0 scale-100 delay-150"
        }
      `}
    >
      {selectedView === "embroidery-orders" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <EmbroideryOrderList />
        </div>
      )}
      {selectedView === "production-orders" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <ProductionOrderList />
        </div>
      )}
      {selectedView === "purchase-orders" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <PurchaseOrderList />
        </div>
      )}
    </div>
  );
}
