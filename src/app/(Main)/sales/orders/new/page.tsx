import { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Nueva Cotización | ERP",
  description:
    "Crea un nueva cotización con información de cliente, productos y montos en el ERP.",
  openGraph: {
    title: "Nueva Cotización | ERP",
    description:
      "Crea un nueva cotización con información de cliente, productos y montos en el ERP.", 
    type: "website",
  },
};

const OrderForm = dynamic(
  () => import("@/src/features/orders/components/OrderForm"),
  {
    loading: () => (
      <div className="w-full pt-2">
        <div className="animate-pulse rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 h-52" />
      </div>
    ),
  }
);

export default function OrdersNewPage() {
  return (
    <div className="w-full space-y-6 pt-2">
      <OrderForm />
    </div>
  );
}
