import { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Editar Cotización | ERP",
  description:
    "Edita una cotización existente con información de cliente, productos y montos en el ERP.",
  openGraph: {
    title: "Editar Cotización | ERP",
    description:
      "Edita una cotización existente con información de cliente, productos y montos en el ERP.",
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

interface QuotesEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuotesEditPage({ params }: QuotesEditPageProps) {
  const { id } = await params;
  const quoteId = Number(id);

  if (!Number.isFinite(quoteId) || quoteId <= 0) {
    notFound();
  }

  return (
    <div className="w-full space-y-6 pt-2">
      <QuoteForm quoteId={quoteId} />
    </div>
  );
}
