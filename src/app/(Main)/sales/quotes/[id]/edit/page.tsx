import { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirectIfQuoteCannotBeEdited } from "@/src/features/quotes/services/quoteEditAccess.server";

export const metadata: Metadata = {
  title: "Editar Cotización | ERP",
  description: "Edita una cotización existente con información de cliente, productos y montos en el ERP.",
  openGraph: {
    title: "Editar Cotización | ERP",
    description: "Edita una cotización existente con información de cliente, productos y montos en el ERP.",
    type: "website",
  },
};

// Importación dinámica para evitar cargar el bundle completo del formulario en el servidor
const QuoteEditForm = dynamic(
  () =>
    import("@/src/features/quotes/components/QuoteEditForm").then((mod) => mod.QuoteEditForm),
  {
    loading: () => (
      <div className="w-full pt-2 min-h-200">
        <div className="animate-pulse rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 h-52" />
      </div>
    ),
  }
);

interface QuoteEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteEditPage({ params }: QuoteEditPageProps) {
  const { id } = await params;
  const quoteId = Number(id);

  await redirectIfQuoteCannotBeEdited(quoteId);

  return (
    <div className="w-full space-y-6 pt-2">
      <QuoteEditForm quoteId={quoteId} />
    </div>
  );
}
