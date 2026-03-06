import { ArrowLeftIcon } from "@/src/components/Icons";
import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { orderMenuCards } from "../constants/orderCardItems";

const EmbroideryOrderView = dynamic(
  () => import("@/src/features/embroidery-orders/components/EmbroideryOrdersView"),
  { loading: () => <LoadingSkeleton /> }
);
const ProductionOrderView = dynamic(
  () => import("@/src/features/production-orders/components/ProductionOrdersView"),
  { loading: () => <LoadingSkeleton /> }
);
const PurchaseOrderView = dynamic(
  () => import("@/src/features/purchase-orders/components/PurchaseOrdersView"),
  { loading: () => <LoadingSkeleton /> }
);

interface OrderMenuDetailViewProps {
  selectedView: string | null;
  onBack: () => void;
  onNavigate: (view: string) => void;
}

export function OrderMenuDetailView({
  selectedView,
  onBack,
  onNavigate,
}: OrderMenuDetailViewProps) {
  const renderHeader = () => (
    <div className="sticky top-0 z-10 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Volver a órdenes</span>
        </button>
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-full p-1 border border-slate-200/80 dark:border-white/10 w-fit">
          {orderMenuCards.map((card) => {
            const isActive = selectedView === card.view;
            return (
              <button
                key={card.view}
                type="button"
                onClick={() => onNavigate(card.view)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  isActive
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-sky-600"
                }`}
              >
                {card.title}
              </button>
            );
          })}
        </div>
      </div>
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
        <div className="flex flex-col gap-6 cur">
          {renderHeader()}
          <EmbroideryOrderView />
        </div>
      )}
      {selectedView === "production-orders" && (
        <div className="flex flex-col gap-6">
          {renderHeader()}
          <ProductionOrderView />
        </div>
      )}
      {selectedView === "purchase-orders" && (
        <div className="flex flex-col gap-6">
          {renderHeader()}
          <PurchaseOrderView />
        </div>
      )}
    </div>
  );
}
