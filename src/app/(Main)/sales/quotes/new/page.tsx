import { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Nueva Cotización | ERP",
  description:
    "Crea una nueva cotización con información de cliente, productos y montos en el ERP.",
  openGraph: {
    title: "Nueva Cotización | ERP",
    description:
      "Crea una nueva cotización con información de cliente, productos y montos en el ERP.",
    type: "website",
  },
};

const QuoteForm = dynamic(
  () => import("@/src/features/quotes/components/QuoteForm"),
  {
    loading: () => (
      <div className="w-full pt-2">
        <div className="animate-pulse rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 h-52" />
      </div>
    ),
  }
);

export default function QuotesNewPage() {
  return (
    <div className="w-full space-y-6 pt-2">
      <QuoteForm />
    </div>
  );
}
