"use client";

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import { useIsMutating } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable, DataTableVisibleColumn } from "@/src/components/DataTable";
import { quoteColumns } from "./QuoteColumns";
import { useQuoteCsvExport } from "../hooks/useQuoteCsvExport";
import { useQuotePdfExport } from "../hooks/useQuotePdfExport";
import { Quote } from "../interfaces/quote.interface";
import { useQuoteFilters } from "../hooks/useQuoteFilters";
import { QuoteFiltersValue, useQuoteFiltersStore } from "../stores/quote-filters.store";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { useQuotes } from "../hooks/useQuotes";
import { approveOperationsQuoteMutationKey } from "../../operations/hooks/useApproveOperationsQuote";
import { rejectOperationsQuoteMutationKey } from "../../operations/hooks/useRejectOperationsQuote";
import { hasPermission } from "@/src/utils/permissions";
import { validateQuoteForReviewMutationKey } from "../hooks/useValidateQuoteForReview";

const QuoteFiltersDialog = lazy(() =>
  import("./QuoteFiltersDialog").then((mod) => ({ default: mod.QuoteFiltersDialog }))
);

export const QuoteList = () => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const { quotes, isLoading: isOrdersLoading } = useQuotes();
  const filtersHydrated = useQuoteFiltersStore((state) => state.hasHydrated);
  const [visibleOrders, setVisibleOrders] = useState<Quote[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Quote>[]>([]);
  const isAuthorizingOrder =
    useIsMutating({ mutationKey: approveOperationsQuoteMutationKey }) > 0;
  const isRejectingOrder =
    useIsMutating({ mutationKey: rejectOperationsQuoteMutationKey }) > 0;
  const isValidatingReview =
    useIsMutating({ mutationKey: validateQuoteForReviewMutationKey }) > 0;
  const isUpdatingOrderStatus = isAuthorizingOrder || isRejectingOrder;
  const isTableBusy = isUpdatingOrderStatus || isValidatingReview;
  const isSessionLoading = sessionStatus === "loading";
  const canCreateOrder = hasPermission("R-CRM", session?.user);
  const baseOrders = quotes;
  const {
    filters,
    filteredOrders,
    hasActiveFilters,
    applyFilters,
    clearFilters,
    savedFilters,
    saveFilters,
    clearSavedFilters,
    personaPagosOptions,
  } = useQuoteFilters(baseOrders);

  useQuoteCsvExport(visibleOrders, visibleColumns);
  useQuotePdfExport(visibleOrders, visibleColumns);
  const handleApplyFilters = (value: QuoteFiltersValue) => {
    applyFilters(value);
    setIsFiltersOpen(false);
  };
  const handleClearFilters = () => {
    clearFilters();
  };

  if (isOrdersLoading || !filtersHydrated) {
    return (
      <div
        className="mt-12 min-h-165"
        role="status"
        aria-live="polite"
        aria-label="Cargando cotizaciones"
      >
        <LoadingSkeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mt-12 min-h-165">
      <DataTable
        columns={quoteColumns}
        data={filteredOrders}
        baseDataCount={baseOrders.length}
        searchPlaceholder="Buscar cotización..."
        onFiltersClick={() => setIsFiltersOpen(true)}
        isFiltersActive={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onVisibleRowsChange={setVisibleOrders}
        onVisibleColumnsChange={setVisibleColumns}
        isLoadingOverlay={isTableBusy}
        loadingTitle={
          isValidatingReview
            ? "Validando cotización"
            : isRejectingOrder
              ? "Rechazando cotización"
              : "Autorizando cotización"
        }
        loadingMessage={
          isValidatingReview
            ? "Estamos validando la cotización antes de enviarla a revisión. Espera un momento."
            : "Estamos actualizando el estado de la orden."
        }
        actionButton={
          isSessionLoading ? (
            <div className="w-44 shrink-0" aria-hidden="true">
              <LoadingSkeleton className="h-10 rounded-xl" />
            </div>
          ) : canCreateOrder ? (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/sales/quotes/new"
                aria-label="Crear nueva cotización"
                className="inline-flex items-center justify-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/30 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all duration-200 ease-in-out"
              >
                + Nueva cotización
              </Link>
            </div>
          ) : null
        }
      />
      <Suspense fallback={null}>
        {isFiltersOpen && (
          <QuoteFiltersDialog
            open={isFiltersOpen}
            onOpenChange={setIsFiltersOpen}
            value={filters}
            onApply={handleApplyFilters}
            onSave={saveFilters}
            onClearSaved={clearSavedFilters}
            savedValue={savedFilters}
            personaPagosOptions={personaPagosOptions}
          />
        )}
      </Suspense>
    </div>
  );
};
