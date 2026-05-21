"use client";

import { useIsMutating } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import {
  approveOperationsQuoteMutationKey,
} from "../hooks/useApproveOperationsQuote";
import {
  rejectOperationsQuoteMutationKey,
} from "../hooks/useRejectOperationsQuote";
import { useOperationsQuotes } from "../hooks/useOperationsQuotes";
import { operationsQuoteColumns } from "./OperationsQuoteColumns";

export const OperationsQuoteList = () => {
  const {
    operationsQuotes,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useOperationsQuotes();
  const isAuthorizingOperationsQuote =
    useIsMutating({ mutationKey: approveOperationsQuoteMutationKey }) > 0;
  const isRejectingOperationsQuote =
    useIsMutating({ mutationKey: rejectOperationsQuoteMutationKey }) > 0;
  const isUpdatingOperationsQuoteStatus =
    isAuthorizingOperationsQuote || isRejectingOperationsQuote;

  if (isLoading) {
    return (
      <div
        className="min-h-165"
        role="status"
        aria-live="polite"
        aria-label="Cargando cotizaciones operativas"
      >
        <LoadingSkeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar cotizaciones operativas"
        message={(error as Error).message}
      />
    );
  }

  return (
    <div className="min-h-165">
      <DataTable
        columns={operationsQuoteColumns}
        data={operationsQuotes}
        baseDataCount={operationsQuotes.length}
        searchPlaceholder="Buscar cotización operativa..."
        onRefetch={refetch}
        isRefetching={isFetching}
        isLoadingOverlay={isUpdatingOperationsQuoteStatus}
        loadingTitle={
          isRejectingOperationsQuote
            ? "Rechazando cotización operativa"
            : "Autorizando cotización operativa"
        }
        loadingMessage="Estamos actualizando el estado de la cotización operativa."
      />
    </div>
  );
};